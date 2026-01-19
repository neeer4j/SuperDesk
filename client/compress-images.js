// Image compression script for SuperDesk assets
// Run with: node compress-images.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'src', 'assets');

// Files to compress with their target sizes
const filesToCompress = [
    { name: 'sup.png', maxWidth: 1920, quality: 80 },
    { name: 'suppm.png', maxWidth: 1920, quality: 80 },
    { name: 'supimage.png', maxWidth: 1200, quality: 85 },
    { name: 'superdesk.png', maxWidth: 800, quality: 85 },
    { name: 'superdeskw.png', maxWidth: 800, quality: 85 },
    { name: 'superdeskL.png', maxWidth: 1200, quality: 85 },
    { name: 'superdeskwL.png', maxWidth: 1200, quality: 85 },
    { name: 'supipad.png', maxWidth: 1200, quality: 85 },
    { name: 'supmob.png', maxWidth: 800, quality: 85 },
];

async function compressImages() {
    console.log('🔧 Starting image compression...\n');

    for (const file of filesToCompress) {
        const inputPath = path.join(assetsDir, file.name);
        const backupPath = path.join(assetsDir, `${file.name}.backup`);

        if (!fs.existsSync(inputPath)) {
            console.log(`⏭️  Skipping ${file.name} (file not found)`);
            continue;
        }

        const originalSize = fs.statSync(inputPath).size;
        console.log(`📦 Processing ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)} MB)...`);

        try {
            // Create backup
            fs.copyFileSync(inputPath, backupPath);

            // Get image metadata
            const metadata = await sharp(inputPath).metadata();

            // Calculate new dimensions (maintain aspect ratio)
            let newWidth = metadata.width;
            let newHeight = metadata.height;

            if (metadata.width > file.maxWidth) {
                newWidth = file.maxWidth;
                newHeight = Math.round((metadata.height / metadata.width) * file.maxWidth);
            }

            // Compress the image
            await sharp(backupPath)
                .resize(newWidth, newHeight, { fit: 'inside' })
                .png({ quality: file.quality, compressionLevel: 9 })
                .toFile(inputPath);

            const newSize = fs.statSync(inputPath).size;
            const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

            console.log(`   ✅ Compressed: ${(newSize / 1024 / 1024).toFixed(2)} MB (${savings}% smaller)`);

            // Remove backup after successful compression
            fs.unlinkSync(backupPath);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            // Restore from backup if exists
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, inputPath);
                fs.unlinkSync(backupPath);
            }
        }
    }

    console.log('\n✨ Done!');
}

compressImages().catch(console.error);
