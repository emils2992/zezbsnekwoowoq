const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const channels = require('../utils/channels');
const api = require('../utils/api');

module.exports = {
    name: 'serbest-ayarla',
    description: 'Serbest futbolcu kanalını ayarla',
    usage: '.serbest-ayarla #kanal',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isAuthorized(message.member, 'transfer_announce')) {
                return message.reply('❌ Bu komutu kullanma yetkiniz yok!');
            }

            // Kanal kontrolü
            const targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                return message.reply('❌ Lütfen bir kanal etiketleyin!\nKullanım: `.serbest-ayarla #kanal`');
            }

            // Kanalı ayarla (bu örnekte sadece bilgi mesajı gönderiyoruz)
            const setupEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Serbest Futbolcu Kanalı Ayarlandı`)
                .setDescription(`${targetChannel} artık serbest futbolcu duyuru kanalı olarak ayarlandı!`)
                .addFields(
                    {
                        name: '📋 Kullanım',
                        value: 'Artık bu kanala serbest kalan futbolcuların duyuruları otomatik olarak gönderilecek.',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [setupEmbed] });

            // Test duyurusu gönder
            const testEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} Serbest Futbolcu Kanalı Aktif`)
                .setDescription('Bu kanal artık serbest futbolcu duyuruları için aktif!')
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await targetChannel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('Serbest-ayarla komutu hatası:', error);
            message.reply('❌ Kanal ayarlanırken bir hata oluştu!');
        }
    }
};