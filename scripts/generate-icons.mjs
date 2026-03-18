import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const OUT_DIR = path.resolve(process.cwd(), 'public/icons');
const SOURCE_SVG = path.join(OUT_DIR, 'icon.svg');
const FAVICON_SVG = path.join(OUT_DIR, 'favicon.svg');
const PNG_SIZES = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512]
];

async function main() {
  const svg = await fs.readFile(SOURCE_SVG);

  await fs.copyFile(SOURCE_SVG, FAVICON_SVG);

  for (const [filename, size] of PNG_SIZES) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, filename));
  }
}

await main();
