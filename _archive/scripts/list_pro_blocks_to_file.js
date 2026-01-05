const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';
const outputPath = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\pro_blocks_list.txt';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');

const proBlocks = new Set();

lines.forEach(line => {
    const match = line.match(/"name": "(Pro Blocks[^"]+)"/);
    if (match) {
        proBlocks.add(match[1]);
    }
});

const output = Array.from(proBlocks).sort().join('\n');
fs.writeFileSync(outputPath, output);
console.log('List written to pro_blocks_list.txt');
