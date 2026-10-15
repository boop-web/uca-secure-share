// Renders frontend/public/img/logo.svg into the PNG logo, favicons and PWA icons.
// Usage (from the repo root, after `npm ci` in frontend): node scripts/generate-icons.js
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(__dirname, "../frontend/node_modules/sharp"));

const IMG = path.join(__dirname, "../frontend/public/img");
const svg = fs.readFileSync(path.join(IMG, "logo.svg"));

const render = (size) =>
  sharp(svg, { density: Math.max(72, (72 * size) / 64) * 1.5 })
    .resize(size, size)
    .png()
    .toBuffer();

// Minimal ICO writer: PNG-compressed entries (supported by every current browser).
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

(async () => {
  fs.mkdirSync(path.join(IMG, "icons"), { recursive: true });
  fs.writeFileSync(path.join(IMG, "logo.png"), await render(512));
  for (const s of [16, 32]) {
    fs.writeFileSync(path.join(IMG, `favicon-${s}.png`), await render(s));
  }
  fs.writeFileSync(path.join(IMG, "apple-touch-icon.png"), await render(180));
  for (const s of [48, 72, 96, 128, 144, 152, 180, 192, 384, 512]) {
    fs.writeFileSync(
      path.join(IMG, "icons", `icon-${s}x${s}.png`),
      await render(s),
    );
  }
  const entries = [];
  for (const s of [16, 32, 48]) entries.push({ size: s, buf: await render(s) });
  fs.writeFileSync(path.join(IMG, "favicon.ico"), ico(entries));
  console.log("icons written to", IMG);
})();
