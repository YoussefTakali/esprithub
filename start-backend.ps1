# EspritHub Backend Startup Script
Write-Host "🚀 Starting EspritHub Backend..."
Write-Host ""
Write-Host "🔑 ======== ADMIN CREDENTIALS ========"
Write-Host "📧 Email: Youssef.Takali@esprit.tn"
Write-Host "🔐 Password: youssef123"
Write-Host "👑 Role: ADMIN"
Write-Host "====================================="
Write-Host ""

# Set GitHub OAuth environment variables
Write-Host "📋 Setting GitHub OAuth Configuration..."
$env:GITHUB_CLIENT_ID = "Ov23lipGNQsjO5oFhS91"
$env:GITHUB_CLIENT_SECRET = "c46874c8882454f060b386957420b8ebf50476f5"
$env:GITHUB_SCOPE = "user:email,repo"
$env:GITHUB_ORG_NAME = "esprithub"

Write-Host "✅ Environment variables set!"
Write-Host "   Client ID: $env:GITHUB_CLIENT_ID"
Write-Host "   Client Secret: [HIDDEN]"
Write-Host "   Scope: $env:GITHUB_SCOPE"
Write-Host "   Organization: $env:GITHUB_ORG_NAME"
Write-Host ""

# Start the backend
Write-Host "🌱 Starting Spring Boot application..."
Set-Location "server"

# Start Maven
.\mvnw.cmd spring-boot:run