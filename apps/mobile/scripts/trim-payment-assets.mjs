/**
 * Trims whitespace from payment pack icons and writes *-trimmed.png assets.
 * Source: safe_payment_assets *_icon_288px.png (never tile PNGs).
 */
import { mkdir, copyFile, rm as removeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK_DIR = process.argv[2] || path.join(__dirname, '../src/assets/payment-pack-png');
const OUT_DIR = path.join(__dirname, '../src/assets/payment');

const TRIM_THRESHOLD = 12;

async function trimToFile(sourcePath, destPath) {
  await sharp(sourcePath).trim({ threshold: TRIM_THRESHOLD }).png().toFile(destPath);
  const meta = await sharp(destPath).metadata();
  console.log(`Trimmed ${path.basename(destPath)} -> ${meta.width}x${meta.height}`);
}

async function splitAndTrimVisaMastercard(sourcePath, outDir) {
  const { width, height } = await sharp(sourcePath).metadata();
  const mid = Math.floor(width / 2);
  const visaHalf = path.join(outDir, '.visa-half.png');
  const mcHalf = path.join(outDir, '.mc-half.png');

  await sharp(sourcePath).extract({ left: 0, top: 0, width: mid, height }).toFile(visaHalf);
  await sharp(sourcePath)
    .extract({ left: mid, top: 0, width: width - mid, height })
    .toFile(mcHalf);

  await trimToFile(visaHalf, path.join(outDir, 'visa-trimmed.png'));
  await trimToFile(mcHalf, path.join(outDir, 'mastercard-trimmed.png'));
  await removeFile(visaHalf, { force: true });
  await removeFile(mcHalf, { force: true });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const airtelSrc = path.join(PACK_DIR, 'airtel_money_icon_288px.png');
  const mtnSrc = path.join(PACK_DIR, 'mtn_momo_icon_288px.png');
  const dualSrc = path.join(PACK_DIR, 'visa_mastercard_icon_288px.png');

  await trimToFile(airtelSrc, path.join(OUT_DIR, 'airtel-money-trimmed.png'));
  await trimToFile(mtnSrc, path.join(OUT_DIR, 'mtn-momo-trimmed.png'));
  await splitAndTrimVisaMastercard(dualSrc, OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
