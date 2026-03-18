import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildUploadFilename,
  extensionForMimeType,
  findAvailableUploadFilename
} from '../src/files.js';

test('extensionForMimeType resolves supported image types', () => {
  assert.equal(extensionForMimeType('image/heic'), '.heic');
  assert.equal(extensionForMimeType('image/jpeg'), '.jpg');
  assert.equal(extensionForMimeType('image/png'), '.png');
  assert.equal(extensionForMimeType('image/unknown'), null);
});

test('buildUploadFilename preserves extension', () => {
  const filename = buildUploadFilename('image/heif', 1, new Date('2026-03-19T03:15:30.214Z'));
  assert.match(filename, /^20260319-\d{6}-1\.heif$/);
});

test('findAvailableUploadFilename increments sequence within the same second', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-bridge-files-'));
  try {
    await fs.writeFile(path.join(tempDir, '20260319-121530-1.heic'), 'a');
    await fs.writeFile(path.join(tempDir, '20260319-121530-2.heic'), 'b');

    const filename = await findAvailableUploadFilename(
      tempDir,
      'image/heic',
      new Date('2026-03-19T12:15:30')
    );

    assert.equal(filename, '20260319-121530-3.heic');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
