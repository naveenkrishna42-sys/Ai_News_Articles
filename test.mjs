import fs from 'fs';
const buf = fs.readFileSync('scripts/lib/template.mjs');
console.log(buf.indexOf(Buffer.from([0xE2, 0x80, 0xBA]))); // UTF-8 for ›
console.log(buf.indexOf(Buffer.from('â€º')));
