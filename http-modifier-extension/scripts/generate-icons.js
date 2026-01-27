import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');
const SIZES = [16, 32, 48, 128];

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
    console.log(`Generating icons from ${INPUT_FILE}...`);
    
    for (const size of SIZES) {
        const outputFile = path.join(OUTPUT_DIR, `icon-${size}.png`);
        try {
            await sharp(INPUT_FILE)
                .resize(size, size)
                .png()
                .toFile(outputFile);
            console.log(`Generated ${outputFile}`);
        } catch (error) {
            console.error(`Error generating ${outputFile}:`, error);
        }
    }
}

generateIcons();
