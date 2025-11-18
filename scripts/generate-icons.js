const fs = require('fs').promises;
const path = require('path');
const icoLib = require('icojs');
const parseIco = icoLib.parse || (icoLib.default && icoLib.default.parse);
const Jimp = require('jimp');

async function run() {
  const icoPath = path.join(__dirname, '..', 'agent', 'assets', 'icon.ico');
  const outAssets = path.join(__dirname, '..', 'agent', 'assets');
  const outClient = path.join(__dirname, '..', 'client', 'public');

  const buf = await fs.readFile(icoPath);
  const images = await parseIco(buf, 'image/png');
  if (!images || images.length === 0) {
    console.error('No images extracted from ICO');
    process.exit(1);
  }

  // Write extracted frames
  const jimpImages = [];
  for (let i = 0; i < images.length; i++) {
    const arr = images[i];
    const b = Buffer.from(arr);
    const extractedPath = path.join(outAssets, `icon-extracted-${i}.png`);
    await fs.writeFile(extractedPath, b);
    const img = await Jimp.read(b);
    jimpImages.push(img);
    console.log('Wrote', extractedPath, img.bitmap.width, 'x', img.bitmap.height);
  }

  // choose largest image as source
  jimpImages.sort((a, b) => (b.bitmap.width || 0) - (a.bitmap.width || 0));
  const src = jimpImages[0];

  const sizes = [16,32,48,64,128,256,512,1024];
  for (const s of sizes) {
    const out = src.clone();
    out.resize(s, s, Jimp.RESIZE_BICUBIC);
    const outPath = path.join(outAssets, `icon-${s}x${s}.png`);
    await out.writeAsync(outPath);
    console.log('Generated', outPath);
  }

  // copy to client/public names
  await fs.copyFile(path.join(outAssets, 'icon-16x16.png'), path.join(outClient, 'favicon-16x16.png'));
  await fs.copyFile(path.join(outAssets, 'icon-32x32.png'), path.join(outClient, 'favicon-32x32.png'));
  // apple-touch uses 180
  const apple = path.join(outClient, 'apple-touch-icon.png');
  await src.clone().resize(180,180).writeAsync(apple);
  await fs.copyFile(path.join(outAssets, 'icon-256x256.png'), path.join(outClient, 'logo-192x192.png'));
  await fs.copyFile(path.join(outAssets, 'icon-512x512.png'), path.join(outClient, 'logo-512x512.png'));
  await fs.copyFile(path.join(outAssets, 'icon.ico'), path.join(outClient, 'favicon.ico'));

  console.log('Icons generated and copied to client/public and agent/assets');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
