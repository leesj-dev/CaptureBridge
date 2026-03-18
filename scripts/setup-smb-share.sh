#!/bin/zsh
set -euo pipefail

SHARE_DIR="${1:-$HOME/Pictures/CaptureBridge}"
SHARE_NAME="${2:-CaptureBridge}"

mkdir -p "$SHARE_DIR"

if sharing -l | grep -q "name:[[:space:]]*$SHARE_NAME"; then
  echo "SMB share $SHARE_NAME already exists"
  exit 0
fi

sudo sharing -a "$SHARE_DIR" -S "$SHARE_NAME" -s 001
echo "Created SMB share $SHARE_NAME -> $SHARE_DIR"
