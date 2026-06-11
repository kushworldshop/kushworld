#!/bin/bash
# Run on Hetzner VPS as root: bash scripts/setup-ssl.sh
set -euo pipefail

DOMAIN="kushworld.shop"
APP_DIR="/var/www/kushworld"
EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN}}"

echo "==> Opening firewall ports 80 and 443"
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "==> Installing certbot if needed"
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

echo "==> Writing nginx config for ${DOMAIN}"
cat > /etc/nginx/sites-available/kushworld <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name kushworld.shop www.kushworld.shop;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/kushworld /etc/nginx/sites-enabled/kushworld
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "==> Requesting SSL certificate"
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect

echo "==> Ensuring app is running"
cd "${APP_DIR}"
pm2 restart kushworld || pm2 start npm --name "kushworld" -- start
pm2 save

echo "==> Done. Test: https://${DOMAIN}"