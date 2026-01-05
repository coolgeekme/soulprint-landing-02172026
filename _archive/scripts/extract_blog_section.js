const fs = require('fs');
const path = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\_archive\\landing-page-design.json';
const outputPath = 'c:\\Users\\drewp\\OneDrive\\soulprint rough\\Soulprint-roughdraft\\blog_section_structure.json';

const fileContent = fs.readFileSync(path, 'utf8');
const lines = fileContent.split('\n');

let startLine = -1;
let endLine = -1;
let openBraces = 0;
let found = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"name": "Pro Blocks / Blog Section / 1./Breakpoint3"')) {
        startLine = i;
        found = true;
        // The opening brace for this object is likely on the same line or previous line.
        // But based on previous view_file, the line starts with "name": ...
        // So the object started earlier.
        // Let's look backwards for the opening brace.
        // Actually, the "name" property is inside an object.
        // Let's assume the object starts a few lines back.
        // A safer way is to just extract the block starting from "name" and try to balance braces, 
        // but we might miss the opening brace.

        // Let's try to find the opening brace of the component.
        // In the JSON structure, it's likely: { "id": "...", "name": "...", ... }
        // So we search backwards for `{`.
        let j = i;
        while (j >= 0) {
            if (lines[j].trim().endsWith('{')) {
                startLine = j;
                break;
            }
            j--;
        }
        openBraces = 1;
        i = startLine; // Restart loop from startLine to count braces correctly
        continue;
    }

    if (found) {
        const trimmed = line.trim();
        for (let char of trimmed) {
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
        }
        if (openBraces === 0) {
            endLine = i;
            break;
        }
    }
}

if (startLine !== -1 && endLine !== -1) {
    const sectionContent = lines.slice(startLine, endLine + 1).join('\n');
    fs.writeFileSync(outputPath, sectionContent);
    console.log(`Extracted Blog Section to ${outputPath}`);
} else {
    console.log('Could not find or extract Blog Section');
}
