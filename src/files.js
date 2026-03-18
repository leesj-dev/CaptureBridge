import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_EXTENSIONS = new Map([
  ['image/heic', '.heic'],
  ['image/heif', '.heif'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

export function extensionForMimeType(mimeType) {
  return MIME_EXTENSIONS.get((mimeType || '').toLowerCase()) ?? null;
}

function buildTimestamp(now) {
  return (
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}` +
    '-' +
    `${String(now.getHours()).padStart(2, '0')}` +
    `${String(now.getMinutes()).padStart(2, '0')}` +
    `${String(now.getSeconds()).padStart(2, '0')}`
  );
}

export function buildUploadFilename(mimeType, sequence = 1, now = new Date()) {
  const extension = extensionForMimeType(mimeType);
  if (!extension) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequence must be a positive integer');
  }

  return `${buildTimestamp(now)}-${sequence}${extension}`;
}

export async function findAvailableUploadFilename(uploadDir, mimeType, now = new Date()) {
  for (let sequence = 1; sequence < 10000; sequence += 1) {
    const filename = buildUploadFilename(mimeType, sequence, now);
    const finalPath = path.join(uploadDir, filename);

    try {
      await fs.access(finalPath);
    } catch {
      return filename;
    }
  }

  throw new Error('Unable to allocate upload filename');
}

export async function ensureUploadDir(uploadDir) {
  await fs.mkdir(uploadDir, { recursive: true });
}

export function buildUploadPaths(uploadDir, filename) {
  const finalPath = path.join(uploadDir, filename);
  const tempPath = `${finalPath}.tmp`;
  return { finalPath, tempPath };
}
