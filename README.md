# CaptureBridge

CaptureBridge is a mobile web app that lets you capture photos with your device camera, upload the original files to a folder on a macOS host, and access that folder over SMB from another device.

## Why It Helps

A typical use case is capturing whiteboard photos with an iPhone and then annotating them on an iPad in a note-taking app (e.g. GoodNotes). The iPad camera may not have the zoom range you want, so using the iPhone telephoto lens is more practical, but the usual workflow is slow: open the Camera app, take a photo, share it over AirDrop, pick the iPad, get kicked into the Photos app on the iPad, switch back to your note-taking app, and insert the image. You have to repeat that for every shot during a live lecture session.

With CaptureBridge, you can keep the web app open on the iPhone and just take photos whenever you need them. Each photo is uploaded to the shared folder automatically, so on the iPad side you only need to pull the images into the note-taking app from the SMB share.

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
4. Open `http://127.0.0.1:3000` locally or, if configured, the Tailscale Serve HTTPS URL from another device.
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

This script creates the SMB share on macOS for the target folder and share name.

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
- supported mime types: `image/heic`, `image/heif`, `image/jpeg`, `image/png`, `image/webp`

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
