-- Fix missing delete permissions for admin users
-- Run this in your Supabase SQL editor

-- 1. Ensure disease:delete permission exists
INSERT INTO permissions (code, description)
VALUES ('disease:delete', 'Soft delete diseases (set is_published=false)')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- 2. Ensure symptom:delete permission exists
INSERT INTO permissions (code, description)
VALUES ('symptom:delete', 'Delete symptoms not associated with active diseases')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- 3. Get the admin role ID
DO $$
DECLARE
    admin_role_id INT;
    disease_delete_perm_id INT;
    symptom_delete_perm_id INT;
BEGIN
    -- Get admin role
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Get permission IDs
    SELECT id INTO disease_delete_perm_id FROM permissions WHERE code = 'disease:delete';
    SELECT id INTO symptom_delete_perm_id FROM permissions WHERE code = 'symptom:delete';
    
    -- Link disease:delete to admin role
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, disease_delete_perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    -- Link symptom:delete to admin role
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, symptom_delete_perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Delete permissions added successfully!';
END $$;

-- 4. Verify the fix - show all admin permissions
SELECT p.code, p.description 
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'admin'
ORDER BY p.code;
