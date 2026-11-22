import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate Favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#0B6E4F"/>
  <!-- Stylized Ledger / Book -->
  <path d="M128 128h224c17.7 0 32 14.3 32 32v224c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32z" fill="#FAF7F2" opacity="0.95"/>
  <path d="M160 96h224c17.7 0 32 14.3 32 32v224c0 17.7-14.3 32-32 32H160" fill="none" stroke="#D8973C" stroke-width="24" stroke-linecap="round"/>
  <!-- Rupee Symbol in Center -->
  <path d="M216 200h80M216 236h80M216 200v112M256 200c24 0 40 12 40 36s-16 36-40 36h-40l60 64" fill="none" stroke="#0B6E4F" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8');

// 2. Pure Node.js PNG Generator
function createPngBuffer(width, height, drawPixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);

    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) {
        v = (v & 1) ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      }
      table[n] = v;
    }
    for (let i = 0; i < body.length; i++) {
      c = table[(c ^ body[i]) & 0xff] ^ (c >>> 8);
    }
    crc.writeInt32BE(~c, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLen;
    rawData[rowStart] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw brand icon pixel function: Rounded emerald square with cream center
function drawBrandIcon(x, y, w, h) {
  // Normalize coords [0, 1]
  const nx = x / w;
  const ny = y / h;

  // Background: #0B6E4F (11, 110, 79)
  const bg = [11, 110, 79, 255];
  // White/cream center card: [0.22, 0.78] in x, [0.22, 0.78] in y
  const inCenterCard = nx >= 0.22 && nx <= 0.78 && ny >= 0.22 && ny <= 0.78;
  // Border of card
  const isCardBorder =
    (nx >= 0.20 && nx <= 0.80 && ny >= 0.20 && ny <= 0.80) && !inCenterCard;

  if (isCardBorder) {
    return [216, 151, 60, 255]; // Golden #D8973C
  }

  if (inCenterCard) {
    // Rupee or M symbol in center (between 0.35 and 0.65)
    const inStem = nx >= 0.38 && nx <= 0.44 && ny >= 0.32 && ny <= 0.68;
    const inTopBar = nx >= 0.38 && nx <= 0.62 && ny >= 0.32 && ny <= 0.38;
    const inMidBar = nx >= 0.38 && nx <= 0.62 && ny >= 0.44 && ny <= 0.50;
    const inCurve = nx >= 0.54 && nx <= 0.62 && ny >= 0.32 && ny <= 0.50;
    const inLeg = (nx - 0.44) > 0 && Math.abs((ny - 0.50) - (nx - 0.44) * 0.9) < 0.04 && ny >= 0.50 && ny <= 0.68;

    if (inStem || inTopBar || inMidBar || inCurve || inLeg) {
      return [11, 110, 79, 255]; // Emerald
    }
    return [250, 247, 242, 255]; // Cream #FAF7F2
  }

  // Rounded corners for the icon
  const cx = 0.5;
  const cy = 0.5;
  const radius = 0.48;
  const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
  if (dist > radius && (nx < 0.1 || nx > 0.9 || ny < 0.1 || ny > 0.9)) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  return bg;
}

// Generate PNGs
const png192 = createPngBuffer(192, 192, drawBrandIcon);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPngBuffer(512, 512, drawBrandIcon);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const appleTouchIcon = createPngBuffer(180, 180, drawBrandIcon);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

// Favicon 32x32 ICO (Minimal valid Windows ICO container embedding 32x32 PNG)
const png32 = createPngBuffer(32, 32, drawBrandIcon);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 Image

const icoDirEntry = Buffer.alloc(16);
icoDirEntry.writeUInt8(32, 0); // Width
icoDirEntry.writeUInt8(32, 1); // Height
icoDirEntry.writeUInt8(0, 2);  // Colors
icoDirEntry.writeUInt8(0, 3);  // Reserved
icoDirEntry.writeUInt16LE(1, 4); // Color planes
icoDirEntry.writeUInt16LE(32, 6); // Bits per pixel
icoDirEntry.writeUInt32LE(png32.length, 8); // Size of image data
icoDirEntry.writeUInt32LE(6 + 16, 12); // Offset to image data

const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, png32]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Successfully generated all PWA icons & favicons:');
console.log(' - public/favicon.svg');
console.log(' - public/favicon.ico');
console.log(' - public/apple-touch-icon.png');
console.log(' - public/pwa-192x192.png');
console.log(' - public/pwa-512x512.png');
