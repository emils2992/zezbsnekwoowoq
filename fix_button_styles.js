const fs = require('fs');

console.log('Fixing undefined button style constants in index.js...');

let content = fs.readFileSync('index.js', 'utf8');

// Fix all undefined button style constants
const styleReplacements = {
    '.setStyle(Success)': '.setStyle(\'SUCCESS\')',
    '.setStyle(Danger)': '.setStyle(\'DANGER\')',
    '.setStyle(Secondary)': '.setStyle(\'SECONDARY\')',
    '.setStyle(Primary)': '.setStyle(\'PRIMARY\')'
};

Object.entries(styleReplacements).forEach(([from, to]) => {
    const count = (content.match(new RegExp(from.replace(/[()]/g, '\\$&'), 'g')) || []).length;
    content = content.replace(new RegExp(from.replace(/[()]/g, '\\$&'), 'g'), to);
    if (count > 0) {
        console.log(`✓ Fixed ${count} instances of ${from}`);
    }
});

fs.writeFileSync('index.js', content);
console.log('All button style constants fixed!');