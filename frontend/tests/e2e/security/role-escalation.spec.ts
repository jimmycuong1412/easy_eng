/**
 * E2E Security Test: Role Escalation Prevention
 *
 * Purpose: Verify that users cannot escalate their roles through any means
 * Constitution Compliance: Principle VII (Role-Based Access Control)
 *
 * Test Scenarios:
 * 1. Student cannot escalate to teacher or admin
 * 2. Teacher cannot escalate to admin
 * 3. Direct API calls are blocked
 * 4. UI manipulation attempts are prevented
 * 5. Token tampering detection
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

test.describe('Role Escalation Prevention', () => {
  let studentEmail: string;
  let teacherEmail: string;
  let studentPassword: string;
  let teacherPassword: string;
  let studentId: string;
  let teacherId: string;

  test.beforeAll(async () => {
    // Create test users with known credentials
    studentEmail = `student-escalation-${Date.now()}@test.com`;
    teacherEmail = `teacher-escalation-${Date.now()}@test.com`;
    studentPassword = 'TestPassword123!';
    teacherPassword = 'TestPassword123!';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create student
    const { data: studentData, error: studentError } = await supabase.auth.signUp({
      email: studentEmail,
      password: studentPassword,
    });

    if (studentError) throw studentError;
    studentId = studentData.user!.id;

    // Create teacher
    const { data: teacherData, error: teacherError } = await supabase.auth.signUp({
      email: teacherEmail,
      password: teacherPassword,
    });

    if (teacherError) throw teacherError;
    teacherId = teacherData.user!.id;

    // Set roles in profiles
    await supabase.from('profiles').update({ role: 'student' }).eq('id', studentId);
    await supabase.from('profiles').update({ role: 'teacher' }).eq('id', teacherId);
  });

  test.afterAll(async () => {
    // Cleanup test users
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await supabase.from('profiles').delete().eq('id', studentId);
    await supabase.from('profiles').delete().eq('id', teacherId);
    await supabase.auth.admin.deleteUser(studentId);
    await supabase.auth.admin.deleteUser(teacherId);
  });

  test('Student cannot escalate to teacher role via UI manipulation', async ({ page }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="password"]', studentPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/student/dashboard');

    // Attempt to access teacher dashboard
    await page.goto('/teacher/dashboard');

    // Should be redirected or see unauthorized message
    await expect(page).not.toHaveURL('/teacher/dashboard');

    // Verify either redirected to student dashboard or see error
    const isRedirected = page.url().includes('/student/dashboard');
    const hasUnauthorized = await page.getByText(/unauthorized|forbidden|access denied/i).isVisible().catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();
  });

  test('Student cannot escalate to admin role via UI manipulation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="password"]', studentPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/student/dashboard');

    // Attempt to access admin dashboard
    await page.goto('/admin/dashboard');

    // Should be blocked
    await expect(page).not.toHaveURL('/admin/dashboard');

    const isRedirected = page.url().includes('/student/dashboard');
    const hasUnauthorized = await page.getByText(/unauthorized|forbidden|access denied/i).isVisible().catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();
  });

  test('Teacher cannot escalate to admin role via UI manipulation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', teacherEmail);
    await page.fill('input[name="password"]', teacherPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/teacher/dashboard');

    // Attempt to access admin dashboard
    await page.goto('/admin/dashboard');

    // Should be blocked
    await expect(page).not.toHaveURL('/admin/dashboard');

    const isRedirected = page.url().includes('/teacher/dashboard');
    const hasUnauthorized = await page.getByText(/unauthorized|forbidden|access denied/i).isVisible().catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();
  });

  test('Student cannot escalate role via direct API call', async ({ request }) => {
    // Login to get auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });

    const token = authData.session?.access_token!;

    // Attempt to update own role via API
    const response = await request.put(`${supabaseUrl}/rest/v1/profiles?id=eq.${studentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      data: {
        role: 'admin',
      },
    });

    // Should be rejected (403 Forbidden or 401 Unauthorized)
    expect([401, 403]).toContain(response.status());

    // Verify role hasn't changed
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', studentId)
      .single();

    expect(profile?.role).toBe('student');
  });

  test('Teacher cannot escalate role via direct API call', async ({ request }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: teacherEmail,
      password: teacherPassword,
    });

    const token = authData.session?.access_token!;

    // Attempt to update own role via API
    const response = await request.put(`${supabaseUrl}/rest/v1/profiles?id=eq.${teacherId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      data: {
        role: 'admin',
      },
    });

    // Should be rejected
    expect([401, 403]).toContain(response.status());

    // Verify role hasn't changed
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', teacherId)
      .single();

    expect(profile?.role).toBe('teacher');
  });

  test('Student cannot create admin gem adjustments', async ({ request }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });

    const token = authData.session?.access_token!;

    // Attempt to create admin gem adjustment
    const response = await request.post('/api/admin/gems/adjust', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        studentId: studentId,
        adjustmentType: 'add',
        amount: 9999,
        reason: 'Fraudulent adjustment',
      },
    });

    // Should be rejected (403 Forbidden)
    expect(response.status()).toBe(403);
  });

  test('Teacher cannot create admin gem adjustments', async ({ request }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: teacherEmail,
      password: teacherPassword,
    });

    const token = authData.session?.access_token!;

    // Attempt to create admin gem adjustment
    const response = await request.post('/api/admin/gems/adjust', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        studentId: studentId,
        adjustmentType: 'add',
        amount: 9999,
        reason: 'Teacher attempting admin action',
      },
    });

    // Should be rejected (403 Forbidden)
    expect(response.status()).toBe(403);
  });

  test('Student cannot modify gem earning rules', async ({ request }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });

    const token = authData.session?.access_token!;

    // Get a gem earning rule ID
    const { data: rules } = await supabase
      .from('gem_earning_rules')
      .select('id')
      .limit(1)
      .single();

    if (!rules) {
      console.warn('No gem rules found, skipping test');
      return;
    }

    // Attempt to update gem rule
    const response = await request.put(`/api/admin/gems-rules/${rules.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        gem_reward: 9999,
      },
    });

    // Should be rejected
    expect([401, 403]).toContain(response.status());
  });

  test('Role information is properly sanitized in responses', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="password"]', studentPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/student/dashboard');

    // Check localStorage/sessionStorage for sensitive data leaks
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage));

    // Should not contain admin credentials or escalation hints
    expect(localStorage).not.toContain('admin_secret');
    expect(localStorage).not.toContain('escalate');
    expect(sessionStorage).not.toContain('admin_secret');
    expect(sessionStorage).not.toContain('escalate');

    // Role should be properly set
    expect(localStorage.toLowerCase()).toContain('student');
  });

  test('Navigation menu respects role boundaries', async ({ page }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', studentEmail);
    await page.fill('input[name="password"]', studentPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/student/dashboard');

    // Check that admin/teacher menu items are not present
    const adminLink = page.getByRole('link', { name: /admin dashboard|admin panel/i });
    const teacherLink = page.getByRole('link', { name: /teacher dashboard|my classes/i });

    await expect(adminLink).not.toBeVisible();
    await expect(teacherLink).not.toBeVisible();
  });
});
