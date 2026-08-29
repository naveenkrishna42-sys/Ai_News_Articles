const broken = "Search this categoryâ€¦";
const buf = Buffer.from(broken, 'latin1');
const fixed = buf.toString('utf8');
console.log("Fixed:", fixed);
