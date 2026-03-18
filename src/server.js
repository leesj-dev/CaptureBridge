import { buildApp } from './app.js';

const app = buildApp();

async function start() {
  try {
    await app.listen({
      host: app.captureBridgeConfig.host,
      port: app.captureBridgeConfig.port
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

await start();
