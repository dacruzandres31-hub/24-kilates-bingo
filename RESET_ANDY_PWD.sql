UPDATE users SET password_hash = '$2a$10$imqNZZOnG78xNJgWX5ImO.HTC1c3PRb.2K25gwpBNcqvB7MYYROa2' WHERE username = 'Andy';
SELECT id, username, role FROM users WHERE username = 'Andy';
