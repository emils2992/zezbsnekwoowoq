const fs = require('fs');
const path = require('path');

console.log('Converting addField to addFields to eliminate deprecation warnings...');

const filesToCheck = [
    'handlers/buttonHandler.js',
    'handlers/commandHandler.js', 
    'utils/embeds.js',
    ...fs.readdirSync('./commands').map(f => `commands/${f}`)
];

filesToCheck.forEach(filePath => {
    if (!fs.existsSync(filePath) || !filePath.endsWith('.js')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Convert multiple consecutive addField calls to single addFields call
    const multipleAddFieldRegex = /(\.addField\([^)]+\)\s*)+/g;
    const matches = content.match(multipleAddFieldRegex);
    
    if (matches) {
        matches.forEach(match => {
            // Extract individual addField calls
            const singleAddFieldRegex = /\.addField\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,]+)\s*,\s*(true|false)\s*\)/g;
            const fields = [];
            let fieldMatch;
            
            while ((fieldMatch = singleAddFieldRegex.exec(match)) !== null) {
                fields.push({
                    name: fieldMatch[1],
                    value: fieldMatch[2],
                    inline: fieldMatch[3]
                });
            }
            
            if (fields.length > 0) {
                // Create addFields replacement
                const fieldsArray = fields.map(field => 
                    `{ name: '${field.name}', value: ${field.value}, inline: ${field.inline} }`
                ).join(', ');
                
                const replacement = `.addFields(${fieldsArray})`;
                content = content.replace(match, replacement);
                hasChanges = true;
            }
        });
    }
    
    if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`✓ Converted addField to addFields in ${filePath}`);
    }
});

console.log('AddField deprecation warnings fixed!');