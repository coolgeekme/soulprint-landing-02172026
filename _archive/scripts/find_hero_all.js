const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');

lines.forEach((line, index) => {
    if (line.includes('Pro Blocks / Hero Section') && line.includes('name')) {
        console.log(`Found at line ${index + 1}: ${line.trim()}`);
    }
});
