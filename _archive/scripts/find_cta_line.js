const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');

lines.forEach((line, index) => {
    if (line.includes('Pro Blocks / CTA Section / 5./Breakpoint3')) {
        console.log(`Found at line ${index + 1}: ${line.trim()}`);
    }
});
