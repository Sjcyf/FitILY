// Генерирует иконки приложения в public/: зелёный круг с белой галочкой на тёмном фоне.
// Без зависимостей: рисует пиксели сам и кодирует PNG через zlib.
// Запуск: node scripts/make-icons.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [10, 10, 10];
const GREEN = [34, 197, 94];
const WHITE = [255, 255, 255];

// Всё в долях стороны. Круг радиусом 0,36 помещается в «безопасную зону» maskable-иконки (0,4).
const CIRCLE_R = 0.36;
const CHECK = [
  [0.35, 0.52],
  [0.455, 0.625],
  [0.665, 0.405],
];
const CHECK_HALF_WIDTH = 0.04;

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function colorAt(x, y) {
  if (Math.hypot(x - 0.5, y - 0.5) > CIRCLE_R) return BG;
  const d = Math.min(distToSegment(x, y, CHECK[0], CHECK[1]), distToSegment(x, y, CHECK[1], CHECK[2]));
  return d <= CHECK_HALF_WIDTH ? WHITE : GREEN;
}

// Сглаживание: 4×4 подвыборки на пиксель.
function render(size) {
  const SS = 4;
  const rgb = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          acc[0] += c[0];
          acc[1] += c[1];
          acc[2] += c[2];
        }
      }
      const i = (py * size + px) * 3;
      for (let k = 0; k < 3; k++) rgb[i + k] = Math.round(acc[k] / (SS * SS));
    }
  }
  return rgb;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const rgb = render(size);
  // Каждая строка: байт фильтра (0) + RGB.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="rgb(${BG})"/>
  <circle cx="50" cy="50" r="${CIRCLE_R * 100}" fill="rgb(${GREEN})"/>
  <polyline points="${CHECK.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}" fill="none"
    stroke="#fff" stroke-width="${CHECK_HALF_WIDTH * 200}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('pwa-192.png', out), png(192));
writeFileSync(new URL('pwa-512.png', out), png(512));
writeFileSync(new URL('apple-touch-icon.png', out), png(180));
writeFileSync(new URL('favicon.svg', out), svg);
console.log('Иконки записаны в public/');
