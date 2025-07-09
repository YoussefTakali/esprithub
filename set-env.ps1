# EspritHub Backend Startup Script
Write-Host "🚀 Starting EspritHub Backend..."
Write-Host ""
Write-Host "🔑 ======== ADMIN CREDENTIALS ========"
Write-Host "📧 Email: Youssef.Takali@esprit.tn"
Write-Host "🔐 Password: youssef123"
Write-Host "👑 Role: ADMIN"
Write-Host "====================================="
Write-Host ""

# Load environment variables from .env file
$envFile = "server/.env"
$setEnvScript = "set-env.ps1"

if (Test-Path $envFile) {
    Write-Host "📄 Loading environment variables from .env file..."
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✅ Environment variables loaded!"
}
elseif (Test-Path $setEnvScript) {
    Write-Host "⚠️  .env file not found, trying set-env.ps1..."
    . .\set-env.ps1
}
else {
    Write-Host "❌ No environment configuration found!"
    exit 1
}

# Display the variables (hide secret)
Write-Host "📋 GitHub OAuth Configuration:"
Write-Host "   Client ID: $env:GITHUB_CLIENT_ID"
if ($env:GITHUB_CLIENT_SECRET) {
    Write-Host "   Client Secret: [HIDDEN]"
} else {
    Write-Host "   Client Secret: NOT SET"
}
if ($env:GITHUB_SCOPE) {
    Write-Host "   Scope: $env:GITHUB_SCOPE"
} else {
    Write-Host "   Scope: NOT SET"
}
if ($env:GITHUB_ORG_NAME) {
    Write-Host "   Organization: $env:GITHUB_ORG_NAME"
} else {
    Write-Host "   Organization: NOT SET"
}

# Start the backend
Write-Host "🌱 Starting Spring Boot application..."
Set-Location "server"
$env:GITHUB_CLIENT_ID = $env:GITHUB_CLIENT_ID
$env:GITHUB_CLIENT_SECRET = $env:GITHUB_CLIENT_SECRET
$env:GITHUB_SCOPE = $env:GITHUB_SCOPE
$env:GITHUB_ORG_NAME = $env:GITHUB_ORG_NAME

Start-Process -NoNewWindow -Wait -FilePath "./mvnw.cmd" -ArgumentList "spring-boot:run"
