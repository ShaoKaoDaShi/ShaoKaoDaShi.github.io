import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用修改后的 SVG 图标，SVG 是矢量图，可以完美解决清晰度问题
const INPUT_FILENAME = "artifacts_icon.svg";
const INPUT_FILE = path.join(__dirname, `../public/icons/${INPUT_FILENAME}`);
const OUTPUT_DIR = path.join(__dirname, "../public/icons");
const SIZES = [16, 32, 48, 128];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
  console.log(`Generating icons from ${INPUT_FILE}...`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: Input file not found: ${INPUT_FILE}`);
    return;
  }

  try {
    // 对于 SVG，我们需要在输入时指定 density 以确保渲染清晰度
    // 默认 density 是 72dpi。为了生成高质量的 128px 图标，我们需要更高的密度
    // 实际上 sharp 处理 SVG resize 时会自动重新渲染，但为了保险我们手动处理一下

    for (const size of SIZES) {
      const outputFile = path.join(OUTPUT_DIR, `icon-${size}.png`);

      // 直接从 SVG 渲染到目标尺寸是最高清的方案
      await sharp(INPUT_FILE)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputFile);

      console.log(`Generated ${outputFile} (size: ${size}x${size} from SVG)`);
    }
  } catch (error) {
    console.error("Error processing icons:", error);
  }
}

generateIcons();
