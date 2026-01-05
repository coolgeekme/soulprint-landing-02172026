const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';

try {
    const data = fs.readFileSync(path, 'utf8');
    const json = JSON.parse(data);

    // Find Hero Section
    const heroSection = json.frames.find(f => f.name.includes('Hero Section'));

    if (heroSection) {
        console.log('Found Hero Section:', heroSection.name, heroSection.id);
        console.log('Has children:', !!heroSection.children);

        if (heroSection.children) {
            console.log('Children count:', heroSection.children.length);
            heroSection.children.forEach(child => {
                console.log('Child Name:', child.name);
                console.log('Child Type:', child.type);
                // Check for Desktop
                if (child.name.includes('Desktop')) {
                    console.log('--- DESKTOP VARIANT FOUND ---');
                    // Print text content to understand what's in it
                    printTextNodes(child);
                }
            });
        }
    } else {
        console.log('Hero Section not found');
    }

} catch (e) {
    console.error('Error:', e);
}

function printTextNodes(node) {
    if (node.type === 'TEXT') {
        console.log('Text:', node.name, 'Chars:', node.characters);
    }
    if (node.children) {
        node.children.forEach(printTextNodes);
    }
}
