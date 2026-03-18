#!/bin/zsh
set -euo pipefail

PORT="${1:-3000}"

tailscale serve --bg --yes "http://127.0.0.1:$PORT"
tailscale serve status
