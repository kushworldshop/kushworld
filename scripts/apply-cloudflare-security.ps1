# Apply Cloudflare security recommendations from Security Insights scan.
# Requires: $env:CF_API_TOKEN (Zone Settings Edit + Account Turnstile if creating widget)
#           $env:CF_ZONE_ID
# Usage: .\scripts\apply-cloudflare-security.ps1

$ErrorActionPreference = "Stop"

$token = $env:CF_API_TOKEN
$zoneId = $env:CF_ZONE_ID

if (-not $token -or -not $zoneId) {
  Write-Host "Set CF_API_TOKEN and CF_ZONE_ID first." -ForegroundColor Red
  exit 1
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

function Set-ZoneSetting {
  param([string]$Id, [object]$Value)
  $body = @{ value = $Value } | ConvertTo-Json -Compress
  $uri = "https://api.cloudflare.com/client/v4/zones/$zoneId/settings/$Id"
  try {
    $resp = Invoke-RestMethod -Uri $uri -Method Patch -Headers $headers -Body $body
    if (-not $resp.success) {
      Write-Host "  SKIP $Id (API error): $($resp.errors | ConvertTo-Json -Compress)" -ForegroundColor Yellow
      return $false
    }
    Write-Host "  OK $Id -> $Value" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "  SKIP $Id (need Zone Settings Edit permission on API token)" -ForegroundColor Yellow
    return $false
  }
}

function Invoke-CfApi {
  param([string]$Method, [string]$Uri, [object]$Body)
  $params = @{ Uri = $Uri; Method = $Method; Headers = $headers }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
  return Invoke-RestMethod @params
}

Write-Host "=== Cloudflare security hardening: kushworld.shop ===" -ForegroundColor Cyan

Write-Host "`nZone settings..." -ForegroundColor Yellow
Set-ZoneSetting -Id "ssl" -Value "strict"
Set-ZoneSetting -Id "always_use_https" -Value "on"
Set-ZoneSetting -Id "automatic_https_rewrites" -Value "on"
Set-ZoneSetting -Id "min_tls_version" -Value "1.2"
Set-ZoneSetting -Id "browser_check" -Value "on"
Set-ZoneSetting -Id "security_level" -Value "medium"
Set-ZoneSetting -Id "bot_fight_mode" -Value "on"

Write-Host "`nHSTS..." -ForegroundColor Yellow
$hstsBody = @{
  value = @{
    strict_transport_security = @{
      enabled = $true
      max_age = 31536000
      include_subdomains = $true
      preload = $false
      nosniff = $true
    }
  }
}
try {
  $hsts = Invoke-CfApi -Method Patch -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/settings/security_header" -Body $hstsBody
  if ($hsts.success) { Write-Host "  OK HSTS enabled (includeSubDomains, 1 year)" -ForegroundColor Green }
  else { Write-Host "  HSTS warning: $($hsts.errors | ConvertTo-Json -Compress)" -ForegroundColor Yellow }
} catch {
  Write-Host "  SKIP HSTS (need Zone Settings Edit permission on API token)" -ForegroundColor Yellow
}

Write-Host "`nSecurity.txt (Cloudflare Security Center)..." -ForegroundColor Yellow
try {
  $secTxt = Invoke-CfApi -Method Put -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/security_center/features/security.txt/state" -Body @{ enabled = $true }
  if ($secTxt.success) { Write-Host "  OK Security.txt feature enabled in CF" -ForegroundColor Green }
} catch {
  Write-Host "  Security.txt API skipped (plan or permission): $_" -ForegroundColor Yellow
}

Write-Host "`nTurnstile widget..." -ForegroundColor Yellow
$zone = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId"
$accountId = $zone.result.account.id
$widgets = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/challenges/widgets"
$existing = $widgets.result | Where-Object { $_.domains -contains "kushworld.shop" -or $_.name -eq "Kush World Forms" } | Select-Object -First 1

if ($existing) {
  Write-Host "  Existing widget: $($existing.sitekey)" -ForegroundColor Green
  $sitekey = $existing.sitekey
} else {
  $created = Invoke-CfApi -Method Post -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/challenges/widgets" -Body @{
    name = "Kush World Forms"
    domains = @("kushworld.shop", "www.kushworld.shop", "localhost")
    mode = "managed"
    clearance_level = "no_clearance"
  }
  if ($created.success) {
    $sitekey = $created.result.sitekey
    $secret = $created.result.secret
    Write-Host "  Created Turnstile widget" -ForegroundColor Green
    Write-Host "  Site key: $sitekey" -ForegroundColor Cyan
    Write-Host "  Secret (add to VPS .env as TURNSTILE_SECRET_KEY): $secret" -ForegroundColor Yellow
    $envFile = Join-Path $PSScriptRoot "..\turnstile-keys.local.txt"
    @(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$sitekey"
      "TURNSTILE_SECRET_KEY=$secret"
      "# Add these lines to /var/www/kushworld/.env on the VPS"
    ) | Set-Content $envFile
    Write-Host "  Keys saved to $envFile (do not commit)" -ForegroundColor Cyan
  } else {
    Write-Host "  Turnstile create failed: $($created.errors | ConvertTo-Json -Compress)" -ForegroundColor Yellow
  }
}

Write-Host "`nDone. Re-run Security Insights in ~24h to refresh." -ForegroundColor Green
Write-Host ""
Write-Host "MANUAL (if API token only has Cache Purge):" -ForegroundColor Cyan
Write-Host "  Cloudflare dash > kushworld.shop > SSL/TLS > Edge Certificates: Always Use HTTPS ON, HSTS Enable"
Write-Host "  Security > Settings: Bot Fight Mode ON, Security Level Medium, Browser Integrity Check ON"
Write-Host "  Turnstile > Add widget 'Kush World Forms' for kushworld.shop - copy keys to VPS .env"
Write-Host "  My Profile > Authentication: enable 2FA on your Cloudflare account"
Write-Host "Keep autodiscover/email/pay DNS grey-cloud (required for email and payments)." -ForegroundColor Yellow