# Capture Bridge

Capture Bridge is a native-camera upload web app for mobile phones. It captures a photo through the device camera, uploads the original file to a macOS host folder, and keeps that folder ready for SMB access from another device.

## Stack

- Web app: add to the mobile home screen
- API: Fastify upload server
- Storage: `UPLOAD_DIR` from `.env`
- Runtime: `launchd` plus `tailscale serve`
- Share target: macOS SMB share named `CaptureBridge`

## Quick Start

1. Copy `.env.example` to `.env` and set `UPLOAD_DIR`.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://127.0.0.1:3000` locally or the Tailscale Serve HTTPS URL from another device.
5. Add the page to the mobile home screen.

## Scripts

- `npm start`: start the server
- `npm run dev`: start the server in watch mode
- `npm test`: run the Node test suite

## System Setup

### 1. Install the LaunchAgent

```sh
./scripts/install-launch-agent.sh
```

### 2. Enable Tailscale Serve HTTPS

```sh
./scripts/setup-tailscale-serve.sh 3000
```

The app is then available at a tailnet-only HTTPS URL such as `https://your-device-name.your-tailnet.ts.net/`.

### 3. Create the SMB CaptureBridge share

```sh
./scripts/setup-smb-share.sh "$HOME/Pictures/CaptureBridge" CaptureBridge
```

This script calls `sudo sharing -a ... -S CaptureBridge`.

## Client Access

Use `Connect to Server` and connect to the macOS host by Tailscale IP or MagicDNS name. Favorite the `CaptureBridge` share for quick access from your note-taking or document app.

## Upload API

### `GET /api/health`

```json
{
  "ok": true
}
```

### `POST /api/upload`

- `multipart/form-data`
- field name: `photo`

Example response:

```json
{
  "ok": true,
  "filename": "20260319-031530-1.heic",
  "mimeType": "image/heic",
  "savedPath": "/Users/yourname/Pictures/CaptureBridge/20260319-031530-1.heic",
  "receivedAt": "2026-03-19T03:15:30.214Z"
}
```
