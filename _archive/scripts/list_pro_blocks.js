const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');

const proBlocks = new Set();

lines.forEach(line => {
    const match = line.match(/"name": "(Pro Blocks[^"]+)"/);
    if (match) {
        proBlocks.add(match[1]);
    }
});

console.log('Found Pro Blocks components:');
Array.from(proBlocks).sort().forEach(name => console.log(name));
