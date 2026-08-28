// Erzeugt die PWA-Icons aus public/favicon.svg. Bei Logo-Änderung erneut
// ausführen: node scripts/generate-icons.mjs (im frontend/-Verzeichnis)
import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('public/favicon.svg');
const BG = '#ede6ff'; // helles Lavendel aus dem Logo selbst — Logo bleibt darauf gut sichtbar

async function makeIcon(size, logoScale, outPath) {
  const logoWidth = Math.round(size * logoScale);
  const logoHeight = Math.round((logoWidth * 46) / 48);
  const logoBuf = await sharp(svg, { density: 384 })
    .resize(logoWidth, logoHeight, { fit: 'contain' })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

await makeIcon(192, 0.68, 'public/icons/icon-192.png');
await makeIcon(512, 0.68, 'public/icons/icon-512.png');
// Maskable: großzügiger Sicherheitsabstand, da OS das Icon kreisförmig zuschneiden kann
await makeIcon(512, 0.5, 'public/icons/maskable-512.png');
