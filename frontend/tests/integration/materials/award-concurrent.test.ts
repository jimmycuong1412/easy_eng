/**
 * Materials Library — Concurrent award_material_completion test
 * Spec: contracts/rpc-award-completion.md § Concurrency contract
 * Constitution: Principle VI (Currency Integrity)
 *
 * Hits a real Supabase instance. Skipped automatically when env vars are
 * not set (mirrors gems-concurrency.test.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const skipSuite = !supabaseUrl || !serviceRoleKey;

describe.skipIf(skipSuite)(
  'award_material_completion — concurrency + idempotency',
  () => {
    let supabase: SupabaseClient;
    let userId: string;
    let materialId: string;

    beforeAll(async () => {
      supabase = createClient(supabaseUrl as string, serviceRoleKey as string);

      // Pick any seeded vocabulary_pack (non-test, awards gems + XP)
      const { data: material } = await supabase
        .from('materials')
        .select('id')
        .eq('type', 'vocabulary_pack')
        .eq('status', 'published')
        .limit(1)
        .single();
      if (!material) {
        throw new Error('No published vocabulary_pack found — apply seed migration 084');
      }
      materialId = material.id;

      // Create a fresh student profile for the test
      const email = `concurrent-mat-${Date.now()}@test.com`;
      const { data: student } = await supabase
        .from('profiles')
        .insert({ email, full_name: 'Concurrent Materials Test', role: 'student' })
        .select('id')
        .single();
      userId = student!.id;
    });

    it('two parallel award calls produce exactly one ledger row', async () => {
      const calls = [
        supabase.rpc('award_material_completion', {
          p_user_id: userId,
          p_material_id: materialId,
        }),
        supabase.rpc('award_material_completion', {
          p_user_id: userId,
          p_material_id: materialId,
        }),
      ];

      const results = await Promise.all(calls);
      const errors = results.filter((r) => r.error);
      expect(errors).toHaveLength(0);

      // Exactly one transaction row tagged with this material_id
      const { data: rows, error: selErr } = await supabase
        .from('gem_transactions')
        .select('id, amount, transaction_type, metadata')
        .eq('user_id', userId)
        .eq('transaction_type', 'material_completion');
      expect(selErr).toBeNull();
      expect(rows).toHaveLength(1);
      expect(rows![0].metadata).toMatchObject({ material_id: materialId });

      // Exactly one xp_transactions row
      const { data: xpRows } = await supabase
        .from('xp_transactions')
        .select('id, source')
        .eq('student_id', userId)
        .eq('source', 'material_completion');
      expect(xpRows).toHaveLength(1);

      // material_progress shows completed
      const { data: prog } = await supabase
        .from('material_progress')
        .select('state, completed_at, gems_awarded, xp_awarded')
        .eq('user_id', userId)
        .eq('material_id', materialId)
        .single();
      expect(prog?.state).toBe('completed');
      expect(prog?.completed_at).not.toBeNull();
      expect(prog?.gems_awarded).toBeGreaterThan(0);
    });

    it('a third sequential call returns already_completed and inserts nothing', async () => {
      const { data, error } = await supabase.rpc('award_material_completion', {
        p_user_id: userId,
        p_material_id: materialId,
      });
      expect(error).toBeNull();
      expect((data as { already_completed: boolean }).already_completed).toBe(true);

      // Still exactly one ledger row
      const { count } = await supabase
        .from('gem_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('transaction_type', 'material_completion');
      expect(count).toBe(1);
    });

    it('rejects mock_test type with a clear error', async () => {
      const { data: mockMaterial } = await supabase
        .from('materials')
        .select('id')
        .eq('type', 'mock_test')
        .eq('status', 'published')
        .limit(1)
        .single();

      const { error } = await supabase.rpc('award_material_completion', {
        p_user_id: userId,
        p_material_id: mockMaterial!.id,
      });
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/mock test|not.*publishable/i);
    });
  },
);
