import fs from 'node:fs';
import path from 'node:path';

const DEFAULTS = {
  HOST: '127.0.0.1',
  PORT: '3000',
  MAX_UPLOAD_MB: '64',
  UPLOAD_DIR: path.resolve(process.cwd(), 'CaptureBridge')
};

export function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const source = fs.readFileSync(envPath, 'utf8');

    for (const rawLine of source.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    return;
  }
}

export function getConfig() {
  loadEnvFile();

  const port = Number.parseInt(process.env.PORT ?? DEFAULTS.PORT, 10);
  const maxUploadMb = Number.parseInt(
    process.env.MAX_UPLOAD_MB ?? DEFAULTS.MAX_UPLOAD_MB,
    10
  );

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  if (!Number.isInteger(maxUploadMb) || maxUploadMb < 1) {
    throw new Error('MAX_UPLOAD_MB must be a positive integer');
  }

  return {
    host: process.env.HOST?.trim() || DEFAULTS.HOST,
    port,
    uploadDir: path.resolve(process.env.UPLOAD_DIR || DEFAULTS.UPLOAD_DIR),
    maxUploadBytes: maxUploadMb * 1024 * 1024
  };
}
