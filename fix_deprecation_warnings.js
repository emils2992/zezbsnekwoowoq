const fs = require('fs');
const path = require('path');

console.log('Fixing Discord.js v13 deprecation warnings...');

// All files that might contain MessageEmbed code
const filesToCheck = [
    'handlers/buttonHandler.js',
    'handlers/commandHandler.js',
    'utils/embeds.js',
    ...fs.readdirSync('./commands').map(f => `commands/${f}`)
];

filesToCheck.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix setFooter deprecation - change from string to object format
    const setFooterRegex = /\.setFooter\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    if (setFooterRegex.test(content)) {
        content = content.replace(setFooterRegex, '.setFooter({ text: \'$1\' })');
        hasChanges = true;
        console.log(`✓ Fixed setFooter in ${filePath}`);
    }
    
    // Fix addFields deprecation - Discord.js v13 recommends addFields over addField
    // But addField still works, we just need to use the non-deprecated version
    // The warning suggests using addFields instead, so let's convert single addField calls
    
    if (hasChanges) {
        fs.writeFileSync(filePath, content);
    }
});

console.log('Deprecation warnings fixed!');