SELECT id, username, role FROM users WHERE role IN ('admin', 'superadmin') OR username = 'Andy';
