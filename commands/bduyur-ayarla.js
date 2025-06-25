const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'bduyur-ayarla',
    description: 'Transfer listesi duyuru kanalını ayarla',
    
    async execute(client, message, args) {
        try {
            const PermissionManager = require('../utils/permissions');
            const permissions = new PermissionManager();
            
            // Sadece transfer yetkilileri ayarlayabilir
            if (!permissions.isTransferAuthority(message.member)) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
            }

            // Kanal argümanını kontrol et
            if (!args[0]) {
                return message.reply('❌ Lütfen bir kanal belirtin! Kullanım: `.bduyur-ayarla #kanal`');
            }

            // Önce mention edilen kanalı kontrol et
            let targetChannel = message.mentions.channels.first();
            
            // Eğer mention yoksa, argümanı manuel olarak parse et
            if (!targetChannel) {
                const channelMention = args[0];
                
                if (channelMention.startsWith('<#') && channelMention.endsWith('>')) {
                    const channelId = channelMention.slice(2, -1);
                    targetChannel = message.guild.channels.cache.get(channelId);
                } else {
                    // Kanal adı ile arama
                    targetChannel = message.guild.channels.cache.find(channel => 
                        channel.name === channelMention.replace('#', '') && channel.type === 'GUILD_TEXT'
                    );
                }
            }

            if (!targetChannel) {
                return message.reply('❌ Belirtilen kanal bulunamadı!');
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

            // Belirtilen kanalı transfer listesi duyuru kanalı olarak ayarla
            rolesData[message.guild.id].bduyurChannelId = targetChannel.id;

            // Dosyayı kaydet
            fs.writeFileSync(rolesFilePath, JSON.stringify(rolesData, null, 2));

            await message.reply(`✅ ${targetChannel} kanalı transfer listesi duyuru kanalı olarak ayarlandı!`);

        } catch (error) {
            console.error('BDuyur-ayarla komutu hatası:', error);
            message.reply('❌ Kanal ayarlanırken bir hata oluştu!');
        }
    }
};