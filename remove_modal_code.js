const fs = require('fs');

console.log('Removing Discord.js v14 modal code from buttonHandler.js...');

const filePath = './handlers/buttonHandler.js';
let content = fs.readFileSync(filePath, 'utf8');

// Remove all modal-related methods that don't exist in v13
const modalMethods = [
    'handleShowOfferModal',
    'handleShowContractModal', 
    'handleShowTradeModal',
    'handleShowReleaseModal',
    'handleShowHireModal',
    'handleShowAnnouncementModal'
];

modalMethods.forEach(method => {
    // Find and remove the entire method
    const methodRegex = new RegExp(`async ${method}\\([^}]*?\\}\\s*(?=\\s*async|\\s*\\}\\s*module\\.exports|$)`, 'gs');
    content = content.replace(methodRegex, '');
    console.log(`✓ Removed ${method}`);
});

// Remove modal-related switch cases
content = content.replace(/case 'show':\s*if[^}]*?\}\s*break;/gs, '');

// Remove edit cases that call modal methods
content = content.replace(/case 'edit':\s*if[^}]*?\}\s*break;/gs, '');

// Clean up any remaining modal references
content = content.replace(/ModalBuilder|TextInputBuilder|showModal/g, '');

// Remove empty lines and fix formatting
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(filePath, content);
console.log('✓ Modal code removed from buttonHandler.js');