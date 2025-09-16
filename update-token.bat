@echo off
echo ====================================
echo Azure OpenAI Token Update Helper
echo ====================================
echo.
echo Step 1: Run this command to get your token:
echo az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken --output tsv
echo.
echo Step 2: Copy the token output
echo.
echo Step 3: Run the manual script:
echo powershell -ExecutionPolicy Bypass -File "update-token-manual.ps1"
echo.
pause