#!/bin/bash
TOKEN=$(curl -sX POST https://24kilates.xyz/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login_andy.json | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."
curl -s https://24kilates.xyz/api/admin/profile -H "Authorization: Bearer $TOKEN"
