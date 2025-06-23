// Discord.js v13 migration script
const fs = require('fs');
const path = require('path');

// List of files to update
const filesToUpdate = [
    'handlers/buttonHandler.js',
    'commands/rol.js',
    'utils/embeds.js',
    'index.js'
];

// V14 to V13 API mappings
const replacements = [
    // Classes
    { from: /EmbedBuilder/g, to: 'MessageEmbed' },
    { from: /ActionRowBuilder/g, to: 'MessageActionRow' },
    { from: /ButtonBuilder/g, to: 'MessageButton' },
    { from: /StringSelectMenuBuilder/g, to: 'MessageSelectMenu' },
    { from: /ButtonStyle\./g, to: '' },
    
    // Methods
    { from: /\.addFields\(/g, to: '.addField(' },
    { from: /setStyle\(ButtonStyle\.(\w+)\)/g, to: 'setStyle("$1")' },
    { from: /setStyle\("(\w+)"\)/g, to: 'setStyle("$1".toUpperCase())' },
    
    // Interactions
    { from: /interaction\.reply\(\{([^}]+)ephemeral:\s*true/g, to: 'interaction.reply({$1ephemeral: true' },
    { from: /isStringSelectMenu\(\)/g, to: 'isSelectMenu()' },
];

console.log('Starting Discord.js v13 migration...');

filesToUpdate.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Updating ${filePath}...`);
        let content = fs.readFileSync(filePath, 'utf8');
        
        replacements.forEach(replacement => {
            content = content.replace(replacement.from, replacement.to);
        });
        
        // Additional specific fixes
        if (filePath.includes('embeds.js')) {
            // Fix addFields to addField for v13
            content = content.replace(/\.addField\(\s*{\s*name:\s*([^,]+),\s*value:\s*([^,]+),\s*inline:\s*([^}]+)\s*}\s*,?/g, 
                                    '.addField($1, $2, $3)');
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✓ Updated ${filePath}`);
    }
});

console.log('Migration completed!');