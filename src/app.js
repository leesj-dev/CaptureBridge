import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import Fastify from 'fastify';

import { getConfig } from './config.js';
import {
  buildUploadPaths,
  ensureUploadDir,
  extensionForMimeType,
  findAvailableUploadFilename
} from './files.js';

export function buildApp(overrides = {}) {
  const config = {
    ...getConfig(),
    ...overrides
  };

  const app = Fastify({
    logger: true,
    bodyLimit: config.maxUploadBytes
  });

  app.decorate('captureBridgeConfig', config);

  app.register(multipart, {
    limits: {
      files: 1,
      fileSize: config.maxUploadBytes
    }
  });

  app.register(staticPlugin, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/'
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/upload', async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing file field "photo"'
      });
    }

    if (file.fieldname !== 'photo') {
      file.file.resume();
      return reply.code(400).send({
        ok: false,
        error: 'Unexpected field name'
      });
    }

    const extension = extensionForMimeType(file.mimetype);
    if (!extension) {
      file.file.resume();
      return reply.code(415).send({
        ok: false,
        error: `Unsupported mime type: ${file.mimetype}`
      });
    }

    await ensureUploadDir(config.uploadDir);
    const filename = await findAvailableUploadFilename(config.uploadDir, file.mimetype);
    const { finalPath, tempPath } = buildUploadPaths(config.uploadDir, filename);

    try {
      await pipeline(file.file, fs.createWriteStream(tempPath, { flags: 'wx' }));
      await fsp.rename(tempPath, finalPath);
    } catch (error) {
      await fsp.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }

    const receivedAt = new Date().toISOString();
    return reply.code(200).send({
      ok: true,
      filename,
      mimeType: file.mimetype,
      savedPath: finalPath,
      receivedAt
    });
  });

  return app;
}
