const fs = require('fs');
const path = require('path');

// Commands directory
const commandsDir = './commands';
const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

console.log('Fixing embed field formats for Discord.js v13...');

files.forEach(file => {
    const filePath = path.join(commandsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix addField object syntax to individual parameters
    // Pattern: .addField({ name: '...', value: '...', inline: ... })
    content = content.replace(/\.addField\(\s*\{\s*name:\s*(['"`])([^'"`]+)\1\s*,\s*value:\s*(['"`])([^'"`]+)\3\s*,\s*inline:\s*(true|false)\s*\}\s*\)/g, 
        (match, nameQuote, name, valueQuote, value, inline) => {
            return `.addField('${name}', '${value}', ${inline})`;
        }
    );
    
    // Fix addField with template literals
    content = content.replace(/\.addField\(\s*\{\s*name:\s*(['"`])([^'"`]+)\1\s*,\s*value:\s*([^,]+)\s*,\s*inline:\s*(true|false)\s*\}\s*\)/g, 
        (match, nameQuote, name, value, inline) => {
            return `.addField('${name}', ${value}, ${inline})`;
        }
    );
    
    // Fix multiple addField calls in one chain
    content = content.replace(/\.addField\(\s*\{\s*name:\s*(['"`])([^'"`]+)\1[^}]*\}\s*,\s*\{\s*name:\s*(['"`])([^'"`]+)\3[^}]*\}[^)]*\)/g, 
        (match) => {
            // Extract individual field objects and convert them
            const fieldMatches = match.match(/\{\s*name:\s*(['"`])([^'"`]+)\1\s*,\s*value:\s*([^,}]+)\s*,\s*inline:\s*(true|false)\s*\}/g);
            if (fieldMatches) {
                let result = '';
                fieldMatches.forEach((fieldMatch, index) => {
                    const fieldParts = fieldMatch.match(/name:\s*(['"`])([^'"`]+)\1\s*,\s*value:\s*([^,}]+)\s*,\s*inline:\s*(true|false)/);
                    if (fieldParts) {
                        const [, , name, value, inline] = fieldParts;
                        result += `.addField('${name}', ${value}, ${inline})`;
                    }
                });
                return result;
            }
            return match;
        }
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed embed fields in ${file}`);
});

console.log('All embed fields updated for Discord.js v13!');