#!/bin/bash
# Test login API

echo '{"username":"Prueba1","password":"123456"}' > /tmp/login.json
cat /tmp/login.json

echo "Testing local API..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json

echo ""
echo "Testing public API..."
curl -s -X POST https://24kilates.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json
