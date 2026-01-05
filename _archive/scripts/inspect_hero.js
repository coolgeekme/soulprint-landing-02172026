const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';

try {
    const data = fs.readFileSync(path, 'utf8');
    const json = JSON.parse(data);

    // Find Hero Section
    const heroSection = json.frames.find(f => f.name.includes('Hero Section'));

    if (heroSection) {
        console.log('Found Hero Section:', heroSection.name, heroSection.id);
        // Check if it has children or if we need to look elsewhere
        // The extracted JSON structure might vary, let's inspect keys
        console.log('Keys:', Object.keys(heroSection));

        if (heroSection.children) {
            console.log('Children count:', heroSection.children.length);
            heroSection.children.forEach(child => {
                console.log('Child:', child.name, child.type, child.id);
                if (child.name === 'Desktop' || child.name.includes('Desktop')) {
                    console.log('Found Desktop variant:', JSON.stringify(child, null, 2).substring(0, 500) + '...');
                }
            });
        }
    } else {
        console.log('Hero Section not found in frames top level');
        // Search recursively if needed, but let's start here
    }

} catch (e) {
    console.error('Error:', e);
}
