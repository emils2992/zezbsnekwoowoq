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

            if (transferCount === 0) {
                return message.reply('❌ Silinecek transfer kaydı yok!');
            }

            // transfers.json dosyasını tamamen sil
            if (fs.existsSync(transfersPath)) {
                fs.unlinkSync(transfersPath);
            }

            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Kayıtları Silindi')
                .setDescription(`${transferCount} transfer kaydı tamamen silindi!`)
                .addFields(
                    { name: '👤 Silen', value: message.author.toString(), inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true },
                    { name: '🏢 Sunucu', value: message.guild.name, inline: true },
                    { name: '🗑️ Dosya Durumu', value: 'transfers.json dosyası tamamen silindi', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi - Silme' });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('TFReset komutu hatası:', error);
            message.reply('❌ Transfer kayıtları sıfırlanırken bir hata oluştu!');
        }
    }
};