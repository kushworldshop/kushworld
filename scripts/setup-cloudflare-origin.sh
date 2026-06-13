#!/bin/bash
# Run on Hetzner VPS as root AFTER Cloudflare proxies kushworld.shop (orange cloud ON).
# Usage: bash scripts/setup-cloudflare-origin.sh [--lock-origin]
set -euo pipefail

LOCK_ORIGIN=false
if [[ "${1:-}" == "--lock-origin" ]]; then
  LOCK_ORIGIN=true
fi

echo "==> Fetching Cloudflare IP ranges"
CF_V4=$(curl -fsSL https://www.cloudflare.com/ips-v4/)
CF_V6=$(curl -fsSL https://www.cloudflare.com/ips-v6/)

echo "==> Writing /etc/nginx/conf.d/cloudflare-real-ip.conf"
{
  echo "# Cloudflare real client IP — auto-generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  while read -r cidr; do
    [[ -n "$cidr" ]] && echo "set_real_ip_from ${cidr};"
  done <<< "$CF_V4"
  while read -r cidr; do
    [[ -n "$cidr" ]] && echo "set_real_ip_from ${cidr};"
  done <<< "$CF_V6"
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > /etc/nginx/conf.d/cloudflare-real-ip.conf

if $LOCK_ORIGIN; then
  echo "==> Writing /etc/nginx/conf.d/cloudflare-allow-only.conf (block direct-to-IP hits)"
  {
    echo "# Only accept HTTP(S) from Cloudflare — auto-generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    while read -r cidr; do
      [[ -n "$cidr" ]] && echo "allow ${cidr};"
    done <<< "$CF_V4"
    while read -r cidr; do
      [[ -n "$cidr" ]] && echo "allow ${cidr};"
    done <<< "$CF_V6"
    echo "deny all;"
  } > /etc/nginx/conf.d/cloudflare-allow-only.conf

  SITE_CONF="/etc/nginx/sites-enabled/kushworld"
  if [[ -f "$SITE_CONF" ]] && ! grep -q cloudflare-allow-only "$SITE_CONF"; then
    sed -i '/server_name kushworld.shop/a \    include /etc/nginx/conf.d/cloudflare-allow-only.conf;' "$SITE_CONF"
  fi
fi

echo "==> Ensuring nginx site allows large uploads (admin images)"
SITE_CONF="/etc/nginx/sites-enabled/kushworld"
if [[ -f "$SITE_CONF" ]]; then
  if ! grep -q 'client_max_body_size' "$SITE_CONF"; then
    sed -i '/server_name kushworld.shop/a \    client_max_body_size 10M;' "$SITE_CONF"
  fi
fi

nginx -t
systemctl reload nginx

if $LOCK_ORIGIN; then
  echo ""
  echo "Origin locked to Cloudflare IPs only."
  echo "Direct hits to 46.62.249.173 should now fail — traffic must go through Cloudflare."
else
  echo ""
  echo "Real IP headers configured. Run again with --lock-origin after Cloudflare DNS is active:"
  echo "  bash scripts/setup-cloudflare-origin.sh --lock-origin"
fi

echo "Done."