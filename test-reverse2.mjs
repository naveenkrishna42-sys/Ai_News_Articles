function reverseMojibake(str) {
    const win1252 = {
      8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135,
      710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145,
      8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152,
      8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159
    };
    
    let bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (win1252[code]) bytes[i] = win1252[code];
      else if (code < 256) bytes[i] = code;
      else return str;
    }
    return new TextDecoder('utf-8').decode(bytes);
}

const inputs = ["â€¦", "â†\x90", "ðŸ  ", "ðŸ‡®ðŸ‡³", "â‚¹", "â–º"];
inputs.forEach(i => console.log(i, "->", reverseMojibake(i)));
