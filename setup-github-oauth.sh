#!/bin/bash

# EspritHub GitHub OAuth Configuration Script
echo "=== EspritHub GitHub OAuth Setup ==="
echo ""

# Check if credentials are provided as arguments
if [ $# -eq 2 ]; then
    GITHUB_CLIENT_ID=$1
    GITHUB_CLIENT_SECRET=$2
    echo "Using provided credentials..."
else
    # Prompt for GitHub OAuth credentials
    echo "Please enter your GitHub OAuth app credentials:"
    echo "(Create an OAuth app at: https://github.com/settings/developers)"
    echo ""
    
    read -p "GitHub Client ID: " GITHUB_CLIENT_ID
    read -s -p "GitHub Client Secret: " GITHUB_CLIENT_SECRET
    echo ""
fi

# Validate inputs
if [ -z "$GITHUB_CLIENT_ID" ] || [ -z "$GITHUB_CLIENT_SECRET" ]; then
    echo "Error: Both Client ID and Client Secret are required!"
    exit 1
fi

# Export environment variables
export GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID"
export GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET"

echo ""
echo "✅ GitHub OAuth credentials configured!"
echo "Client ID: $GITHUB_CLIENT_ID"
echo "Client Secret: [HIDDEN]"
echo ""

# Create a .env file for the Spring Boot application
cat > server/.env << EOF
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
EOF

echo "✅ Created server/.env file with GitHub credentials"
echo ""

# Instructions
echo "=== Next Steps ==="
echo "1. Make sure Docker is running for the database:"
echo "   docker-compose up -d"
echo ""
echo "2. Start the Spring Boot backend:"
echo "   cd server && ./mvnw spring-boot:run"
echo ""
echo "3. Start the Angular frontend:"
echo "   cd client && npm start"
echo ""
echo "4. Open http://localhost:4200 and test the login flow"
echo ""

# Optionally start the services
read -p "Do you want to start the services now? (y/n): " START_SERVICES

if [ "$START_SERVICES" = "y" ] || [ "$START_SERVICES" = "Y" ]; then
    echo ""
    echo "Starting Docker services..."
    docker-compose up -d
    
    echo ""
    echo "You can now manually start:"
    echo "Backend: cd server && GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET ./mvnw spring-boot:run"
    echo "Frontend: cd client && npm start"
fi
