import fs from 'fs';
fetch('https://earnkaro.com/').then(r => r.text()).then(t => {
    fs.writeFileSync('earnkaro.html', t);
    console.log('Saved earnkaro.html');
});
