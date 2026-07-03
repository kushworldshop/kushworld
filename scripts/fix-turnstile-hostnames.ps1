# Fix Cloudflare Turnstile "unable to connect to site" on kushworld.shop
#
# Root cause: the Turnstile widget's Hostname Management must include kushworld.shop.
#
# OPTION A — Cloudflare Dashboard (no API token changes)
#   1. Open https://dash.cloudflare.com/?to=/:account/turnstile
#   2. Open the widget whose Site Key matches your .env (see below)
#   3. Settings → Hostname Management → Add Hostnames
#   4. Add: kushworld.shop  (this also covers www.kushworld.shop and subdomains)
#   5. Save, wait ~1 minute, hard-refresh the site (Ctrl+Shift+R)
#
# OPTION B — API (requires a NEW token with Account → Turnstile → Read + Edit)
#   Create token: https://dash.cloudflare.com/profile/api-tokens
#   Then run:
#     $env:TURNSTILE_CF_API_TOKEN = "your-account-turnstile-token"
#     .\scripts\fix-turnstile-hostnames.ps1 -Apply

param(
  [switch]$Apply,
  [string]$SiteKey = "",
  [string[]]$Domains = @("kushworld.shop", "www.kushworld.shop", "localhost")
)

$ErrorActionPreference = "Stop"

$sshKey = "$env:USERPROFILE\.ssh\kushworld_github_actions_ci"
$remote = "root@46.62.249.173"
$vpsEnv = "/var/www/kushworld/.env"

function Get-VpsTurnstileKeys {
  if (-not (Test-Path $sshKey)) {
    Write-Host "SSH key not found; pass -SiteKey manually." -ForegroundColor Yellow
    return @{ SiteKey = $SiteKey; Secret = "" }
  }
  $lines = ssh -o BatchMode=yes -i $sshKey $remote "grep -E '^(NEXT_PUBLIC_TURNSTILE_SITE_KEY|TURNSTILE_SECRET_KEY)=' $vpsEnv" 2>$null
  $map = @{}
  foreach ($line in $lines) {
    if ($line -match '^([^=]+)=(.*)$') { $map[$Matches[1]] = $Matches[2] }
  }
  return @{
    SiteKey = if ($SiteKey) { $SiteKey } else { $map['NEXT_PUBLIC_TURNSTILE_SITE_KEY'] }
    Secret  = $map['TURNSTILE_SECRET_KEY']
  }
}

$keys = Get-VpsTurnstileKeys
if (-not $keys.SiteKey) {
  Write-Host "Could not read NEXT_PUBLIC_TURNSTILE_SITE_KEY from VPS .env" -ForegroundColor Red
  exit 1
}

Write-Host "=== Kush World Turnstile fix ===" -ForegroundColor Cyan
Write-Host "Production site key: $($keys.SiteKey)" -ForegroundColor Green
Write-Host "Required hostnames:  $($Domains -join ', ')" -ForegroundColor Green
Write-Host ""
Write-Host "In Cloudflare Turnstile, open the widget with that site key and add kushworld.shop under Hostname Management." -ForegroundColor Yellow
Write-Host "Dashboard: https://dash.cloudflare.com/?to=/:account/turnstile" -ForegroundColor Cyan
Write-Host ""

if (-not $Apply) {
  Write-Host "Dry run only. To patch hostnames via API, create an Account Turnstile API token and run:" -ForegroundColor Yellow
  Write-Host '  $env:TURNSTILE_CF_API_TOKEN = "..."' -ForegroundColor Gray
  Write-Host "  .\scripts\fix-turnstile-hostnames.ps1 -Apply" -ForegroundColor Gray
  exit 0
}

$token = $env:TURNSTILE_CF_API_TOKEN
if (-not $token) {
  Write-Host "Set TURNSTILE_CF_API_TOKEN (Account Turnstile Read+Edit) for -Apply" -ForegroundColor Red
  exit 1
}

$zoneToken = $env:CF_API_TOKEN
$zoneId = $env:CF_ZONE_ID
if (-not $zoneToken -or -not $zoneId) {
  Write-Host "Also set CF_API_TOKEN and CF_ZONE_ID to resolve account id." -ForegroundColor Red
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}
$zoneHeaders = @{ Authorization = "Bearer $zoneToken" }
$accountId = (Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId" -Headers $zoneHeaders).result.account.id

$widgets = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/challenges/widgets" -Headers $headers
$widget = $widgets.result | Where-Object { $_.sitekey -eq $keys.SiteKey } | Select-Object -First 1

if (-not $widget) {
  Write-Host "No widget found for site key $($keys.SiteKey). Create one in the dashboard or update .env keys." -ForegroundColor Red
  exit 1
}

$body = @{ domains = $Domains } | ConvertTo-Json -Compress
$uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/challenges/widgets/$($widget.id)"
$resp = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body $body

if ($resp.success) {
  Write-Host "Updated widget '$($widget.name)' hostnames to: $($Domains -join ', ')" -ForegroundColor Green
} else {
  Write-Host "API error: $($resp.errors | ConvertTo-Json -Compress)" -ForegroundColor Red
  exit 1
}