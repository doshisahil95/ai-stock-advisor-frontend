#!/bin/bash
set -e

# Frontend UPDATE / deploy script (run on the EC2 box).
#   pull latest → npm install → build → restart portfolio-advisor-ui → healthcheck.
#
# NEXT_PUBLIC_API_BASE_URL is compiled into the bundle at BUILD time, so it must
# be set for `npm run build`. Unless explicitly provided, derive it from this
# box's tailnet IP (http://<tailscale-ip>:8000) — the same value the provisioner
# uses. All paths are env-overridable; defaults match the author's EC2 box.
DEPLOY_REPO_DIR="${DEPLOY_REPO_DIR:-$HOME/ai-stock-advisor-frontend}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://localhost:3000}"
SERVICE="${SERVICE:-portfolio-advisor-ui.service}"
API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://$(tailscale ip -4 2>/dev/null | head -1):8000}"

cd "$DEPLOY_REPO_DIR"
echo "→ Pulling latest..."
git pull --ff-only

echo "→ Installing deps..."
npm install --legacy-peer-deps

echo "→ Building (NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL)..."
NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL" npm run build

echo "→ Restarting $SERVICE..."
sudo systemctl restart "$SERVICE"
sleep 4
sudo systemctl --no-pager status "$SERVICE" | head -6

echo "→ Healthcheck..."
curl -sS -o /dev/null -w "ui -> %{http_code}\n" "$HEALTHCHECK_URL"
echo "✅ Frontend deploy complete"
