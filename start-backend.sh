#!/bin/bash

# EspritHub Backend Startup Script
echo "🚀 Starting EspritHub Backend..."
echo ""
echo "🔑 ======== ADMIN CREDENTIALS ========"
echo "📧 Email: Youssef.Takali@esprit.tn"
echo "🔐 Password: youssef123"
echo "👑 Role: ADMIN"
echo "====================================="
echo ""

# Load environment variables from .env file
if [ -f "server/.env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' server/.env | xargs)
    echo "✅ Environment variables loaded!"
else
    echo "⚠️  .env file not found, trying set-env.sh..."
    if [ -f "set-env.sh" ]; then
        source set-env.sh
    else
        echo "❌ No environment configuration found!"
        exit 1
    fi
fi

# Display the variables (hide secret)
echo "📋 GitHub OAuth Configuration:"
echo "   Client ID: ${GITHUB_CLIENT_ID:-'NOT SET'}"
echo "   Client Secret: ${GITHUB_CLIENT_SECRET:+[HIDDEN]}"

# Start the backend
echo "🌱 Starting Spring Boot application..."
cd server
export GITHUB_CLIENT_ID
export GITHUB_CLIENT_SECRET
./mvnw spring-boot:run
