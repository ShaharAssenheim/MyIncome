-- Create accessible_users view
-- Returns all user IDs that a given user can access
-- (includes their own ID plus any users who shared with them)

CREATE OR REPLACE VIEW accessible_users AS
SELECT 
  auth_users.id as user_id,
  auth_users.id as accessible_id,
  true as is_owner
FROM auth_users
UNION
SELECT 
  user_shares.shared_with_id as user_id,
  user_shares.owner_id as accessible_id,
  false as is_owner
FROM user_shares
WHERE user_shares.shared_with_id IS NOT NULL;
