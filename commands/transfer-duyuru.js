const { MessageEmbed } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const api = require('../utils/api');

module.exports = {
    name: 'transfer-duyuru',
    description: 'Transfer duyuru kanalını ayarla',
    usage: '.transfer-duyuru #kanal',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isAuthorized(message.member, 'transfer_announce')) {
                return message.reply('❌ Bu komutu kullanma yetkiniz yok!');
            }

            // Kanal kontrolü
            const targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                return message.reply('❌ Lütfen bir kanal etiketleyin!\nKullanım: `.transfer-duyuru #kanal`');
            }

            // Kanal ayarını kaydet
            const roleData = permissions.getRoleData(message.guild.id);
            roleData.transferChannel = targetChannel.id;
            
            // Manuel kaydetme (basit JSON dosyası kullanımı)
            const fs = require('fs');
            const path = require('path');
            const rolesPath = path.join(__dirname, '../data/roles.json');
            
            let allData = {};
            try {
                allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            } catch (error) {
                allData = {};
            }
            
            if (!allData[message.guild.id]) {
                allData[message.guild.id] = {};
            }
            
            allData[message.guild.id].transferChannel = targetChannel.id;
            fs.writeFileSync(rolesPath, JSON.stringify(allData, null, 2));

            // Başarı mesajı
            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Transfer Duyuru Kanalı Ayarlandı`)
                .setDescription(`${targetChannel} artık transfer duyuru kanalı olarak ayarlandı!\n\nArtık transfer kabul edildiğinde otomatik olarak bu kanala duyuru gönderilecek.`)
                .addFields({ name: '📋 Nasıl Çalışır?', value: '• Futbolcu teklifi kabul ettiğinde\n• Sözleşme imzalandığında\n• Takas tamamlandığında\n\nOtomatik olarak form bilgileriyle duyuru gönderilir.', inline: false }).setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [successEmbed] });

            // Test duyurusu gönder
            const testEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} Transfer Duyuru Kanalı Aktif`)
                .setDescription('Bu kanal artık otomatik transfer duyuruları için ayarlandı!')
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await targetChannel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('Transfer-duyuru komutu hatası:', error);
            message.reply('❌ Transfer duyuru kanalı ayarlanırken bir hata oluştu!');
        }
    }
};
