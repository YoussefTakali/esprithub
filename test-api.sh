#!/bin/bash

echo "=== EspritHub API Testing ==="
echo

# Health check
echo "1. Testing Health Endpoint:"
curl -s http://localhost:8090/api/v1/health | jq .
echo

# Login test
echo "2. Testing Login (Student):"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@esprit.tn",
    "password": "student123"
  }')

echo "$LOGIN_RESPONSE" | jq .
echo

# Extract token for further testing
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    echo "3. Testing Protected Endpoint (/auth/me):"
    curl -s -X GET http://localhost:8090/api/v1/auth/me \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
    echo
    
    echo "4. Testing GitHub Token Validation:"
    curl -s -X GET http://localhost:8090/api/v1/auth/github/validate \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
    echo
else
    echo "Login failed - no access token received"
fi

echo "=== Testing Complete ==="
