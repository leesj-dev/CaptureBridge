import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildApp } from '../src/app.js';

process.env.MAX_UPLOAD_MB = '4';

test('health endpoint responds with ok', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-bridge-'));
  process.env.UPLOAD_DIR = tempDir;
  const app = buildApp();
  t.after(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/health'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
});

test('upload endpoint stores original mime extension', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-bridge-'));
  process.env.UPLOAD_DIR = tempDir;
  const app = buildApp();
  t.after(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const boundary = '----capturebridge';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="photo"; filename="test.heic"\r\n' +
        'Content-Type: image/heic\r\n\r\n'
    ),
    Buffer.from('heic-binary'),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const response = await app.inject({
    method: 'POST',
    url: '/api/upload',
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload: body
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.mimeType, 'image/heic');
  assert.match(payload.filename, /\.heic$/);

  const fileBuffer = await fs.readFile(payload.savedPath);
  assert.equal(fileBuffer.toString(), 'heic-binary');
});

test('upload endpoint rejects missing file', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-bridge-'));
  process.env.UPLOAD_DIR = tempDir;
  const app = buildApp();
  t.after(async () => {
    await app.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/upload'
  });

  assert.equal(response.statusCode, 406);
});
