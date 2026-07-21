import sharp from "sharp";
import { resolve } from "node:path";

const source = resolve("public/og.png");
const crop = { left: 965, top: 250, width: 430, height: 430 };

async function icon(size, filename, padding = 0) {
  const inner = size - padding * 2;
  let image = sharp(source).extract(crop).resize(inner, inner, { fit: "cover" });
  if (padding) image = image.extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#315f52" });
  await image.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(resolve(`public/${filename}`));
}

await Promise.all([
  icon(180, "apple-touch-icon.png"),
  icon(192, "icon-192.png"),
  icon(512, "icon-512.png"),
  icon(512, "icon-maskable-512.png", 76),
]);
