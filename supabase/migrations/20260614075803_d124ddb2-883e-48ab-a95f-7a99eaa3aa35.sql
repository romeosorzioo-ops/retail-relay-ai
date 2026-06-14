
-- Grant admin role to developer account
INSERT INTO public.user_roles (user_id, role)
VALUES ('66d4c903-9476-4c0d-9894-dddb8871e8cd', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Auto-grant admin role on signup when email matches the developer account
CREATE OR REPLACE FUNCTION public.auto_grant_dev_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'romeosorzioo@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_dev_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_dev_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_dev_admin();
