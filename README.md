# CaptureBridge

CaptureBridge is a mobile web app that lets you capture photos with your device camera, upload the original files to a folder on a Mac host, and access that folder over SMB from another device.

## Why It Helps

A typical use case is capturing whiteboard photos with an iPhone and then annotating them on an iPad in a note-taking app (e.g. GoodNotes). The iPad camera may not have the zoom range you want, so using the iPhone telephoto lens is more practical, but the usual workflow is slow: open the Camera app, take a photo, share it over AirDrop, pick the iPad, get kicked into the Photos app on the iPad, switch back to your note-taking app, and insert the image. You have to repeat that for every shot during a live lecture session.

With CaptureBridge, you can keep the web app open on the iPhone and just take photos whenever you need them. Each photo is uploaded to the shared folder automatically, so on the iPad side you only need to pull the images into the note-taking app from the SMB share.

## Stack

- Web app: add to the mobile home screen
- API: Fastify upload server
- Storage: `UPLOAD_DIR` from `.env`
- Runtime: `launchd` plus `tailscale serve`
- Share target: macOS SMB share named `CaptureBridge`

## Prerequisites
- A Mac host such as a MacBook or Mac mini, with Node.js installed
- To open the app over the tailnet, install Tailscale for all client and host devices
- If you use a MacBook as the host, keep it awake and connected to the network while capturing photos

## Setup

1. Copy `.env.example` to `.env` and set `UPLOAD_DIR` to save the images.
2. Install dependencies.

```sh
npm install
```

3. Start the server and verify that the app opens locally.

```sh
npm start
```

Open `http://127.0.0.1:3000` on the Mac host, or open the Tailscale Serve HTTPS URL from another device if you configure it in a later step. Once it looks good on mobile, add the page to the home screen.

4. Install the LaunchAgent so the server starts automatically on the Mac host.

```sh
./scripts/install-launch-agent.sh
```

5. If you want tailnet-only HTTPS access from another device, enable Tailscale Serve.

```sh
./scripts/setup-tailscale-serve.sh 3000
```

The app is then available at a tailnet-only HTTPS URL such as `https://your-device-name.your-tailnet.ts.net/`.

6. Create the SMB `CaptureBridge` share for the upload folder.

```sh
./scripts/setup-smb-share.sh "$HOME/Pictures/CaptureBridge" CaptureBridge
```

This script creates the SMB share on the Mac host for the target folder and share name.

## Scripts

- `npm start`: start the server
- `npm run dev`: start the server in watch mode
- `npm test`: run the Node test suite

## Client Access

1. Open the Files app.
2. Tap the more menu and choose `Connect to Server`.
3. Connect to the Mac host by LAN IP, Tailscale IP, or MagicDNS name.
4. Open the `CaptureBridge` share.
5. Favorite it for quick access for the note-taking app.

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
