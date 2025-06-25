const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'bduyur-ayarla',
    description: 'Transfer listesi duyuru kanalını ayarla',
    
    async execute(client, message, args) {
        try {
            const permissions = require('../utils/permissions');
            
            // Sadece transfer yetkilileri ayarlayabilir
            if (!permissions.isTransferAuthority(message.member)) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
            }

            const rolesFilePath = path.join(__dirname, '../data/roles.json');
            
            // Roles dosyasını oku
            let rolesData = {};
            if (fs.existsSync(rolesFilePath)) {
                rolesData = JSON.parse(fs.readFileSync(rolesFilePath, 'utf8'));
            }

            // Guild verisini hazırla
            if (!rolesData[message.guild.id]) {
                rolesData[message.guild.id] = {};
            }

            // Bu kanalı transfer listesi duyuru kanalı olarak ayarla
            rolesData[message.guild.id].bduyurChannelId = message.channel.id;

            // Dosyayı kaydet
            fs.writeFileSync(rolesFilePath, JSON.stringify(rolesData, null, 2));

            await message.reply(`✅ ${message.channel} kanalı transfer listesi duyuru kanalı olarak ayarlandı!`);

        } catch (error) {
            console.error('BDuyur-ayarla komutu hatası:', error);
            message.reply('❌ Kanal ayarlanırken bir hata oluştu!');
        }
    }
};