-- Emergency commerce rollback: non-destructive, reversible, and fail-closed.
-- This does not delete products, orders, payments, stock, or evidence.
update public.commerce_settings
set checkout_release_authorized = false,
    updated_at = now()
where singleton = true;
