-- ============================================================================
-- 093: Referral RPCs (Growth Plan — Phase 2.1)
-- ============================================================================
-- Tables referral_codes + referrals already existed; the RPCs were never applied
-- to live. Flow: each student gets a code; a new user redeems it; when the
-- referred user completes their first class, both sides get gems via
-- gem_transactions (type 'referral_bonus').
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS TABLE (code text, total_referrals int, successful_referrals int, gems_earned int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user'; END IF;
  SELECT rc.code INTO v_code FROM referral_codes rc WHERE rc.student_id = v_uid;
  IF v_code IS NULL THEN
    LOOP
      v_code := '';
      FOR i IN 1..6 LOOP
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
    END LOOP;
    INSERT INTO referral_codes (student_id, code) VALUES (v_uid, v_code)
    ON CONFLICT (student_id) DO UPDATE SET code = referral_codes.code
    RETURNING referral_codes.code INTO v_code;
  END IF;
  RETURN QUERY SELECT rc.code, rc.total_referrals, rc.successful_referrals, rc.gems_earned
    FROM referral_codes rc WHERE rc.student_id = v_uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rc referral_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user'; END IF;
  SELECT * INTO v_rc FROM referral_codes WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_code'); END IF;
  IF v_rc.student_id = v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'self_referral'); END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;
  INSERT INTO referrals (referrer_id, referred_id, referral_code_id)
  VALUES (v_rc.student_id, v_uid, v_rc.id);
  UPDATE referral_codes SET total_referrals = total_referrals + 1, updated_at = now() WHERE id = v_rc.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_referral_if_pending(p_referred_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref referrals%ROWTYPE;
  v_reward int := 100;
BEGIN
  SELECT * INTO v_ref FROM referrals
  WHERE referred_id = p_referred_id AND referred_completed_first_class = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral'); END IF;
  INSERT INTO gem_transactions (user_id, amount, transaction_type, description)
  VALUES (v_ref.referrer_id, v_reward, 'referral_bonus', 'Bạn được giới thiệu hoàn thành buổi học đầu tiên');
  INSERT INTO gem_transactions (user_id, amount, transaction_type, description)
  VALUES (v_ref.referred_id, v_reward, 'referral_bonus', 'Thưởng giới thiệu — hoàn thành buổi học đầu tiên');
  UPDATE referrals SET referred_completed_first_class = true, gems_awarded_to_referrer = v_reward WHERE id = v_ref.id;
  UPDATE referral_codes SET successful_referrals = successful_referrals + 1,
         gems_earned = gems_earned + v_reward, updated_at = now() WHERE id = v_ref.referral_code_id;
  RETURN jsonb_build_object('ok', true, 'reward', v_reward);
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_referral_if_pending(uuid) TO authenticated, service_role;
