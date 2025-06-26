const { MessageEmbed } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();

module.exports = {
    name: 'tfreset',
    description: 'Transfer kayıtlarını sıfırlar (Sadece yetkililer)',
    usage: '.tfreset',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece transfer yetkilileri kullanabilir
            if (!permissions.isTransferAuthority(message.member)) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
            }

            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            // Veri klasörünü oluştur
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            let transfersData = {};
            if (fs.existsSync(transfersPath)) {
                transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            }

            const guildTransfers = transfersData[message.guild.id] || [];
            const transferCount = guildTransfers.length;

            // Bu sunucunun transfer kayıtlarını sıfırla
            transfersData[message.guild.id] = [];
            
            // Dosyaya kaydet
            fs.writeFileSync(transfersPath, JSON.stringify(transfersData, null, 2));

            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Kayıtları Sıfırlandı')
                .setDescription(`${transferCount} transfer kaydı başarıyla silindi!`)
                .addFields(
                    { name: '👤 Sıfırlayan', value: message.author.toString(), inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true },
                    { name: '🏢 Sunucu', value: message.guild.name, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi' });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('TFReset komutu hatası:', error);
            message.reply('❌ Transfer kayıtları sıfırlanırken bir hata oluştu!');
        }
    }
};