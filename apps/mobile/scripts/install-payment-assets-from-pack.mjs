/**
 * Installs official SAFE payment icons from safe_payment_assets (Google Drive pack).
 * Uses *_icon_288px.png only — never tile PNGs (baked "Card payment" subtitle).
 */
import { mkdir, copyFile, rm as removeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK_DIR = process.argv[2] || path.join(__dirname, '../src/assets/payment-pack-png');
const OUT_DIR = path.join(__dirname, '../src/assets/payment');

const SOURCES = {
  airtelMoney: 'airtel_money_icon_288px.png',
  mtnMoMo: 'mtn_momo_icon_288px.png',
  visaMastercard: 'visa_mastercard_icon_288px.png',
};

async function splitVisaMastercard(sourcePath, outDir) {
  const { width, height } = await sharp(sourcePath).metadata();
  const mid = Math.floor(width / 2);

  const visaHalf = path.join(outDir, '.visa-half.png');
  const mcHalf = path.join(outDir, '.mc-half.png');

  await sharp(sourcePath).extract({ left: 0, top: 0, width: mid, height }).toFile(visaHalf);
  await sharp(sourcePath)
    .extract({ left: mid, top: 0, width: width - mid, height })
    .toFile(mcHalf);

  await sharp(visaHalf).trim({ threshold: 15 }).toFile(path.join(outDir, 'visa.png'));
  await sharp(mcHalf).trim({ threshold: 15 }).toFile(path.join(outDir, 'mastercard.png'));
  await removeFile(visaHalf, { force: true });
  await removeFile(mcHalf, { force: true });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const [key, filename] of Object.entries(SOURCES)) {
    const src = path.join(PACK_DIR, filename);
    if (key === 'visaMastercard') continue;
    const destName = key === 'airtelMoney' ? 'airtel-money.png' : 'mtn-mobile-money.png';
    await copyFile(src, path.join(OUT_DIR, destName));
    console.log(`Installed ${destName} <- ${filename}`);
  }

  await splitVisaMastercard(path.join(PACK_DIR, SOURCES.visaMastercard), OUT_DIR);
  console.log('Installed visa.png and mastercard.png <- visa_mastercard_icon_288px.png (split)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
