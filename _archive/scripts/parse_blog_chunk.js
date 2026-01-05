const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\blog_section_chunk.json';

const fileContent = fs.readFileSync(path, 'utf8');
// The file content is a list of lines, not valid JSON.
// But we can search for "characters" fields near "Pro Blocks / Blog Card".

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
            // Heuristic to identify date vs description
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

console.log(JSON.stringify(cards, null, 2));
