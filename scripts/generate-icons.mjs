import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const buildDir = path.join(root, "build");

const faviconSvg = await readFile(path.join(publicDir, "favicon.svg"));
const maskableSvg = await readFile(path.join(publicDir, "maskable.svg"));

const render = (svg, size) =>
  sharp(svg, { density: 512 }).resize(size, size, { fit: "contain" }).png().toBuffer();

async function main() {
  await mkdir(buildDir, { recursive: true });

  const targets = [
    { svg: faviconSvg, size: 192, out: path.join(publicDir, "pwa-192x192.png") },
    { svg: faviconSvg, size: 512, out: path.join(publicDir, "pwa-512x512.png") },
    { svg: maskableSvg, size: 512, out: path.join(publicDir, "maskable-512x512.png") },
    { svg: faviconSvg, size: 180, out: path.join(publicDir, "apple-touch-icon.png") },
    { svg: faviconSvg, size: 512, out: path.join(buildDir, "icon.png") },
  ];

  for (const { svg, size, out } of targets) {
    await writeFile(out, await render(svg, size));
    console.log(`✓ ${path.relative(root, out)} (${size}×${size})`);
  }

  const icoPngs = await Promise.all([16, 32, 48, 64, 128, 256].map((s) => render(faviconSvg, s)));
  const ico = await pngToIco(icoPngs);
  await writeFile(path.join(publicDir, "favicon.ico"), ico);
  await writeFile(path.join(buildDir, "icon.ico"), ico);
  console.log("✓ public/favicon.ico + build/icon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
