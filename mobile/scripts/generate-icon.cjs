const fs = require('node:fs');
const zlib = require('node:zlib');
const size = 1024;
const pixels = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y++) {
    const offset = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - 512);
        const dy = Math.abs(y - 512);
        const cross = (dx < 85 && dy < 240) || (dy < 85 && dx < 240);
        const ring =
            Math.hypot(x - 512, y - 512) > 343 &&
            Math.hypot(x - 512, y - 512) < 351;
        const color = cross
            ? [220, 242, 226]
            : ring
              ? [88, 137, 105]
              : [23, 77, 59];
        for (let channel = 0; channel < 3; channel++)
            pixels[offset + 1 + x * 4 + channel] = color[channel];
        pixels[offset + 1 + x * 4 + 3] = 255;
    }
}
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
    const tag = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tag, bytes])));
    return Buffer.concat([length, tag, bytes, crc]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync('assets/icon.png', png);
fs.writeFileSync('assets/favicon.png', png);
console.log('Generated the NEU Health native app icon.');
