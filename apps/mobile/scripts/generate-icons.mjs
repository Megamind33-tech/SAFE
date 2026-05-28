import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_ICON = 'src/assets/SAFE_app_icon_master_3D_1024.png';
const RES_DIR = 'android/app/src/main/res';

const DENSITIES = [
  { name: 'mdpi', legacySize: 48, fgSize: 108 },
  { name: 'hdpi', legacySize: 72, fgSize: 162 },
  { name: 'xhdpi', legacySize: 96, fgSize: 216 },
  { name: 'xxhdpi', legacySize: 144, fgSize: 324 },
  { name: 'xxxhdpi', legacySize: 192, fgSize: 432 }
];

async function generateIcons() {
  console.log(`Starting Android launcher icon generation from: ${SOURCE_ICON}`);
  
  if (!fs.existsSync(SOURCE_ICON)) {
    throw new Error(`Source icon not found at ${SOURCE_ICON}`);
  }

  for (const density of DENSITIES) {
    const dirPath = path.join(RES_DIR, `mipmap-${density.name}`);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 1. Generate Legacy Square Icon (ic_launcher.png)
    const legacyPath = path.join(dirPath, 'ic_launcher.png');
    await sharp(SOURCE_ICON)
      .resize(density.legacySize, density.legacySize)
      .toFile(legacyPath);
    console.log(`Generated square launcher icon: ${legacyPath} (${density.legacySize}x${density.legacySize})`);

    // 2. Generate Legacy Round Icon (ic_launcher_round.png)
    const roundPath = path.join(dirPath, 'ic_launcher_round.png');
    const r = density.legacySize / 2;
    const circleSvg = Buffer.from(
      `<svg><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
    );
    await sharp(SOURCE_ICON)
      .resize(density.legacySize, density.legacySize)
      .composite([{
        input: circleSvg,
        blend: 'dest-in'
      }])
      .toFile(roundPath);
    console.log(`Generated round launcher icon: ${roundPath} (${density.legacySize}x${density.legacySize})`);

    // 3. Generate Adaptive Foreground Icon (ic_launcher_foreground.png)
    const fgPath = path.join(dirPath, 'ic_launcher_foreground.png');
    
    // Scale logo down to 65% of the adaptive icon size so it fits inside the safe zone (66dp)
    const logoScale = 0.65;
    const logoSize = Math.round(density.fgSize * logoScale);
    
    const resizedLogoBuffer = await sharp(SOURCE_ICON)
      .resize(logoSize, logoSize)
      .toBuffer();

    const offset = Math.round((density.fgSize - logoSize) / 2);

    await sharp({
      create: {
        width: density.fgSize,
        height: density.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: resizedLogoBuffer,
        top: offset,
        left: offset
      }])
      .png()
      .toFile(fgPath);
    console.log(`Generated adaptive foreground icon: ${fgPath} (${density.fgSize}x${density.fgSize})`);
  }

  console.log('\nSUCCESS: All Android launcher icons successfully generated!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
