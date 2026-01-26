/**
 * Generate PWA icons with black background from logo SVG
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// Read the SVG
const svgPath = join(publicDir, 'logo.svg');
const svgContent = readFileSync(svgPath, 'utf8');

// Create a version with black background
async function generateIcon(size) {
    const padding = Math.round(size * 0.1); // 10% padding
    const logoSize = size - (padding * 2);
    
    // Create black background with centered logo
    const icon = await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
    })
    .composite([{
        input: await sharp(Buffer.from(svgContent))
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer(),
        gravity: 'center'
    }])
    .png()
    .toBuffer();
    
    return icon;
}

async function main() {
    console.log('Generating icons with black background...\n');
    
    for (const size of sizes) {
        const filename = `icon-${size}x${size}.png`;
        const filepath = join(iconsDir, filename);
        
        try {
            const buffer = await generateIcon(size);
            writeFileSync(filepath, buffer);
            console.log(`✓ ${filename}`);
        } catch (err) {
            console.error(`✗ ${filename}: ${err.message}`);
        }
    }
    
    // Also generate apple-touch-icon (180x180)
    try {
        const buffer = await generateIcon(180);
        writeFileSync(join(iconsDir, 'apple-touch-icon.png'), buffer);
        console.log('✓ apple-touch-icon.png');
    } catch (err) {
        console.error(`✗ apple-touch-icon.png: ${err.message}`);
    }
    
    console.log('\nDone! Icons generated with black background.');
}

main().catch(console.error);
