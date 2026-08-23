import fs from 'fs';
const t = fs.readFileSync('earnkaro.html', 'utf8');
const match = t.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
if (match) {
    const data = JSON.parse(match[1]);
    // The data might be in props.pageProps
    fs.writeFileSync('next_data.json', JSON.stringify(data, null, 2));
    console.log('Saved next_data.json');
} else {
    console.log('No next_data found');
}
