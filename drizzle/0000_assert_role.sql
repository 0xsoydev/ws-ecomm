DO $$
BEGIN
  IF current_user <> 'migrate' THEN
    RAISE EXCEPTION 'Migrations must run as the migrate role (DATABASE_URL_MIGRATE), not %', current_user;
  END IF;
END
$$;
