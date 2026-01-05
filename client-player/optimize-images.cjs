const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, 'src', 'assets');
const publicDir = path.join(__dirname, 'public');

// Imágenes PNG a optimizar (resize a max 800px width)
const pngImages = [
  { file: 'bronze_icon.png', maxWidth: 400 },
  { file: 'gold_icon.png', maxWidth: 400 },
  { file: 'silver_icon.png', maxWidth: 400 },
  { file: 'Gift_icon.png', maxWidth: 400 },
  { file: 'logo.png', maxWidth: 300 },
  { file: 'select_cards_button.png', maxWidth: 600 }
];

// Imágenes JPG
const jpgImages = [
  { file: 'lobby-background.jpg', maxWidth: 1920, quality: 75 }
];

// Iconos en public (PWA icons - mantener tamaño pero comprimir)
const publicIcons = [
  'apple-touch-icon.png',
  'icon-192x192.png',
  'icon-512x512.png',
  'logo.png'
];

async function optimizePNG(inputPath, maxWidth) {
  const outputPath = inputPath.replace('.png', '_opt.png');
  const originalSize = fs.statSync(inputPath).size;
  
  await sharp(inputPath)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(outputPath);
  
  const newSize = fs.statSync(outputPath).size;
  const reduction = Math.round((1 - newSize/originalSize) * 100);
  
  fs.unlinkSync(inputPath);
  fs.renameSync(outputPath, inputPath);
  
  return { originalSize, newSize, reduction };
}

async function optimizeJPG(inputPath, maxWidth, quality) {
  const outputPath = inputPath.replace('.jpg', '_opt.jpg');
  const originalSize = fs.statSync(inputPath).size;
  
  await sharp(inputPath)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .jpeg({ quality: quality, mozjpeg: true })
    .toFile(outputPath);
  
  const newSize = fs.statSync(outputPath).size;
  const reduction = Math.round((1 - newSize/originalSize) * 100);
  
  fs.unlinkSync(inputPath);
  fs.renameSync(outputPath, inputPath);
  
  return { originalSize, newSize, reduction };
}

async function optimizeImages() {
  console.log('🖼️  Optimizando imágenes...\n');
  
  let totalOriginal = 0;
  let totalNew = 0;
  
  // Optimizar PNGs en assets
  for (const img of pngImages) {
    const inputPath = path.join(assetsDir, img.file);
    if (fs.existsSync(inputPath)) {
      try {
        const result = await optimizePNG(inputPath, img.maxWidth);
        totalOriginal += result.originalSize;
        totalNew += result.newSize;
        console.log(`  ${img.file}: ${Math.round(result.originalSize/1024)}KB → ${Math.round(result.newSize/1024)}KB (${result.reduction}% reducción)`);
      } catch (err) {
        console.error(`  ❌ Error en ${img.file}: ${err.message}`);
      }
    }
  }
  
  // Optimizar JPGs
  for (const img of jpgImages) {
    const inputPath = path.join(assetsDir, img.file);
    if (fs.existsSync(inputPath)) {
      try {
        const result = await optimizeJPG(inputPath, img.maxWidth, img.quality);
        totalOriginal += result.originalSize;
        totalNew += result.newSize;
        console.log(`  ${img.file}: ${Math.round(result.originalSize/1024)}KB → ${Math.round(result.newSize/1024)}KB (${result.reduction}% reducción)`);
      } catch (err) {
        console.error(`  ❌ Error en ${img.file}: ${err.message}`);
      }
    }
  }
  
  // Optimizar iconos en public
  console.log('\n📱 Optimizando iconos PWA...\n');
  for (const icon of publicIcons) {
    const inputPath = path.join(publicDir, icon);
    if (fs.existsSync(inputPath)) {
      try {
        // Solo comprimir, no resize (son iconos PWA con tamaños específicos)
        const result = await optimizePNG(inputPath, 512);
        totalOriginal += result.originalSize;
        totalNew += result.newSize;
        console.log(`  ${icon}: ${Math.round(result.originalSize/1024)}KB → ${Math.round(result.newSize/1024)}KB (${result.reduction}% reducción)`);
      } catch (err) {
        console.error(`  ❌ Error en ${icon}: ${err.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total imágenes: ${Math.round(totalOriginal/1024)}KB → ${Math.round(totalNew/1024)}KB`);
  console.log(`💾 Ahorro total: ${Math.round((totalOriginal - totalNew)/1024)}KB (${Math.round((1 - totalNew/totalOriginal) * 100)}%)`);
  console.log('='.repeat(50));
}

optimizeImages();
