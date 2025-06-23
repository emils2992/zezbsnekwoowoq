const fs = require('fs');
const path = require('path');

// Commands directory
const commandsDir = './commands';
const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

console.log('Fixing all command files for Discord.js v13...');

files.forEach(file => {
    const filePath = path.join(commandsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Discord.js v14 to v13 API fixes
    content = content.replace(/const { ([^}]*?)EmbedBuilder([^}]*?) } = require\('discord\.js'\);/g, 
        (match, before, after) => {
            let imports = before + after;
            imports = imports.replace(/EmbedBuilder/g, 'MessageEmbed');
            imports = imports.replace(/ActionRowBuilder/g, 'MessageActionRow');
            imports = imports.replace(/ButtonBuilder/g, 'MessageButton');
            imports = imports.replace(/StringSelectMenuBuilder/g, 'MessageSelectMenu');
            imports = imports.replace(/ButtonStyle/g, '');
            imports = imports.replace(/ModalBuilder/g, '');
            imports = imports.replace(/TextInputBuilder/g, '');
            imports = imports.replace(/TextInputStyle/g, '');
            
            // Clean up extra commas
            imports = imports.replace(/,\s*,/g, ',').replace(/,\s*}/g, ' }').replace(/{\s*,/g, '{ ');
            
            return `const { ${imports} } = require('discord.js');`;
        }
    );

    // Fix class instantiations
    content = content.replace(/new EmbedBuilder\(\)/g, 'new MessageEmbed()');
    content = content.replace(/new ActionRowBuilder\(\)/g, 'new MessageActionRow()');
    content = content.replace(/new ButtonBuilder\(\)/g, 'new MessageButton()');
    content = content.replace(/new StringSelectMenuBuilder\(\)/g, 'new MessageSelectMenu()');
    
    // Fix button styles
    content = content.replace(/ButtonStyle\.(\w+)/g, "'$1'");
    content = content.replace(/\.setStyle\('(\w+)'\)/g, (match, style) => {
        return `.setStyle('${style.toUpperCase()}')`;
    });
    
    // Fix embed methods
    content = content.replace(/\.addFields\(/g, '.addField(');
    content = content.replace(/\.setFooter\(\{\s*text:\s*([^}]+)\s*\}\)/g, '.setFooter($1)');
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${file}`);
});

console.log('All command files updated for Discord.js v13!');