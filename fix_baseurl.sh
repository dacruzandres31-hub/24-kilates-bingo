#!/bin/bash
# Fix baseURL in main.jsx

cd /var/www/bingo24k/client-player/src

# Backup original
cp main.jsx main.jsx.bak

# Replace the localhost URL with empty string
sed -i "s|http://localhost:3001||g" main.jsx

# Verify
echo "After fix:"
grep -n "baseURL" main.jsx
