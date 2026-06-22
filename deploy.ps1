# deploy.ps1 - Full clean deploy + optional auto Cloudflare cache purge
# Usage: .\deploy.ps1
# For auto-purge after deploy (recommended):
#   $env:CF_API_TOKEN = "your-purge-token"
#   $env:CF_ZONE_ID   = "your-zone-id-here"
#   .\deploy.ps1
# Get token: Cloudflare dash > My Profile > API Tokens > Create Token > "Purge Cache - All zones" or custom "Zone:Cache Purge" for kushworld.shop only.
# Get Zone ID: dash > kushworld.shop > Overview (right sidebar, click to copy Zone ID). Never commit tokens.
# NOTE: If you pasted a token into chat previously for one-time purge, DELETE/rotate that token in CF dashboard immediately for security. Only set tokens in your local PowerShell session.

$ErrorActionPreference = "Stop"

$sshKey = "$env:USERPROFILE\.ssh\kushworld_github_actions_ci"
$remote = "root@46.62.249.173"
$remoteCmd = @'
cd /var/www/kushworld && \
git pull && \
pm2 stop kushworld || true && \
rm -rf node_modules .next /root/.npm package-lock.json && \
npm cache clean --force && \
npm install --legacy-peer-deps && \
npx next build && \
pm2 restart kushworld && \
pm2 status kushworld
'@ -replace "`r`n", " " -replace " +", " "

Write-Host "=== Deploying to VPS (full clean build) ===" -ForegroundColor Cyan
ssh -o BatchMode=yes -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new -i $sshKey $remote $remoteCmd

if ($LASTEXITCODE -ne 0) {
  Write-Host "SSH/deploy failed with exit $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=== AFTER DEPLOY: CLOUDFLARE CACHE PURGE ===" -ForegroundColor Yellow

$token = $env:CF_API_TOKEN
$zone  = $env:CF_ZONE_ID

if ($token -and $zone) {
  Write-Host "Auto-purging Cloudflare cache for zone $zone ..." -ForegroundColor Green
  try {
    $headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
    $body = @{ purge_everything = $true } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" -Method Post -Headers $headers -Body $body
    if ($resp.success) {
      Write-Host "SUCCESS: Cloudflare cache purged (everything)." -ForegroundColor Green
    } else {
      Write-Host "Purge API returned errors:" -ForegroundColor Red
      $resp | ConvertTo-Json -Depth 5
    }
  } catch {
    Write-Host "Auto purge failed: $_" -ForegroundColor Red
    Write-Host "You can still purge manually in the dashboard."
  }
} else {
  Write-Host "CF_API_TOKEN or CF_ZONE_ID not set in current environment - skipping automatic purge." -ForegroundColor Yellow
  Write-Host "To auto-purge on future deploys, set the two env vars before running this script (see header comment)." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "MANUAL STEPS (quick):" -ForegroundColor Cyan
  Write-Host "1. Go to https://dash.cloudflare.com/"
  Write-Host "2. Select the kushworld.shop zone"
  Write-Host "3. Click Caching > Purge Everything (or 'Purge by URLs' and add https://kushworld.shop/ and https://kushworld.shop/api/site-content)"
  Write-Host "4. On your own browser hard-refresh the site: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac), or use incognito/private window."
  Write-Host "This makes sure every visitor worldwide sees the freshest content (homepage updates, site-content changes, etc)."
}

Write-Host ""
Write-Host "Deploy complete. Site should be live at https://kushworld.shop" -ForegroundColor Green
Write-Host "(If you configured the CF env vars, cache was auto-purged above.)" -ForegroundColor Green
