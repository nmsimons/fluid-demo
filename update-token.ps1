# PowerShell script to update Azure OpenAI manual token in .env file
# This script gets a fresh token from Azure CLI and updates the .env file

param(
    [string]$EnvFile = ".env"
)

Write-Host "Updating Azure OpenAI manual token..." -ForegroundColor Cyan

# Check if Azure CLI is installed and user is logged in
try {
    $account = az account show --query "user.name" --output tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: You need to log in to Azure CLI first. Run: az login" -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Logged in as: $account" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    exit 1
}

# Get fresh token from Azure CLI
Write-Host "Getting fresh token from Azure CLI..." -ForegroundColor Yellow
try {
    $newToken = az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken --output tsv
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($newToken)) {
        Write-Host "ERROR: Failed to get token. Make sure you have access to Azure Cognitive Services." -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Successfully obtained new token" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Error getting token: $_" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: .env file not found at: $EnvFile" -ForegroundColor Red
    exit 1
}

# Read current .env file
$envContent = Get-Content $EnvFile

# Update or add the token
$tokenLine = "AZURE_OPENAI_MANUAL_TOKEN=$newToken"
$updatedContent = @()
$tokenFound = $false

foreach ($line in $envContent) {
    if ($line -match "^AZURE_OPENAI_MANUAL_TOKEN=") {
        $updatedContent += $tokenLine
        $tokenFound = $true
        Write-Host "SUCCESS: Updated existing token in .env" -ForegroundColor Green
    }
    else {
        $updatedContent += $line
    }
}

# If token wasn't found, add it
if (-not $tokenFound) {
    $updatedContent += ""
    $updatedContent += "# Auto-updated token $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $updatedContent += $tokenLine
    Write-Host "SUCCESS: Added new token to .env" -ForegroundColor Green
}

# Write back to .env file
try {
    $updatedContent | Out-File -FilePath $EnvFile -Encoding UTF8
    Write-Host "SUCCESS: .env file updated successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Error writing to .env file: $_" -ForegroundColor Red
    exit 1
}

# Show token expiration info
Write-Host ""
Write-Host "Token Information:" -ForegroundColor Cyan
try {
    # Decode JWT to get expiration (basic parsing)
    $tokenParts = $newToken.Split('.')
    if ($tokenParts.Length -ge 2) {
        $payload = $tokenParts[1]
        # Add padding if needed
        while ($payload.Length % 4) {
            $payload += "="
        }
        $decodedBytes = [System.Convert]::FromBase64String($payload)
        $decodedText = [System.Text.Encoding]::UTF8.GetString($decodedBytes)
        $tokenData = $decodedText | ConvertFrom-Json
        
        if ($tokenData.exp) {
            $expTime = [DateTimeOffset]::FromUnixTimeSeconds($tokenData.exp).ToLocalTime()
            Write-Host "   Expires: $expTime" -ForegroundColor White
            
            $timeUntilExpiry = $expTime - (Get-Date)
            if ($timeUntilExpiry.TotalMinutes -gt 0) {
                Write-Host "   Valid for: $([int]$timeUntilExpiry.TotalMinutes) minutes" -ForegroundColor Green
            } else {
                Write-Host "   WARNING: Token is already expired!" -ForegroundColor Yellow
            }
        }
    }
}
catch {
    Write-Host "   Could not parse token expiration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To use the updated token, restart your development server:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "TIP: You can run this script anytime your token expires" -ForegroundColor Cyan