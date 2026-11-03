-- Drop unused view that exposed auth.users to the anon role
DROP VIEW IF EXISTS public.user_metadata;

-- Enable RLS on all public tables. Logged-in members keep full access;
-- anonymous clients with the public anon key cannot read or write data.
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dinner_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_room_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washing_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all ON public.admin_settings;
DROP POLICY IF EXISTS authenticated_all ON public.budget_entries;
DROP POLICY IF EXISTS authenticated_all ON public.dinner_days;
DROP POLICY IF EXISTS authenticated_all ON public.guest_entries;
DROP POLICY IF EXISTS authenticated_all ON public.guest_room_reservation;
DROP POLICY IF EXISTS authenticated_all ON public.washing_reservations;

CREATE POLICY authenticated_all ON public.admin_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.budget_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.dinner_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.guest_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.guest_room_reservation
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.washing_reservations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.admin_settings FROM anon;
REVOKE ALL ON TABLE public.budget_entries FROM anon;
REVOKE ALL ON TABLE public.dinner_days FROM anon;
REVOKE ALL ON TABLE public.guest_entries FROM anon;
REVOKE ALL ON TABLE public.guest_room_reservation FROM anon;
REVOKE ALL ON TABLE public.washing_reservations FROM anon;

-- Dangerous RPCs: service role only
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

REVOKE ALL ON FUNCTION public.remove_user_from_all_future_cooks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_from_all_future_cooks(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.remove_user_from_all_future_dinners(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_from_all_future_dinners(uuid) TO service_role;

-- App RPCs: signed-in users only
REVOKE ALL ON FUNCTION public.get_all_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_metadata(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_metadata(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_user_metadata(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_metadata(uuid, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_user_type(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_type(uuid, text) TO authenticated, service_role;

-- Pin search_path on functions that were missing it
ALTER FUNCTION public.delete_user(uuid) SET search_path = public;
ALTER FUNCTION public.get_all_users() SET search_path = public;
ALTER FUNCTION public.update_user_metadata(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_user_type(uuid, text) SET search_path = public;
ALTER FUNCTION public.remove_user_from_all_future_cooks(uuid) SET search_path = public;
ALTER FUNCTION public.remove_user_from_all_future_dinners(uuid) SET search_path = public;
ALTER FUNCTION public.update_modified_column() SET search_path = public;
