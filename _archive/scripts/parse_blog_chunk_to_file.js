const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\blog_section_chunk.json';
const outputPath = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\blog_cards.json';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');
const cards = [];
let currentCard = {};

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"name": "Pro Blocks / Blog Card / 1."')) {
        if (currentCard.date || currentCard.description) {
            cards.push(currentCard);
        }
        currentCard = {};
    }

    if (line.includes('"characters":')) {
        const match = line.match(/"characters": "(.*)"/);
        if (match) {
            const text = match[1];
            if (text.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)) {
                currentCard.date = text;
            } else if (text.length > 20) {
                currentCard.description = text;
            }
        }
    }
}
if (currentCard.date || currentCard.description) {
    cards.push(currentCard);
}

fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2));
