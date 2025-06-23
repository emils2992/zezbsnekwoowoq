const { MessageEmbed } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');

module.exports = {
    name: 'duyur-ayarla',
    description: 'Serbest futbolcu duyuru kanalını ayarla',
    usage: '.duyur-ayarla #kanal',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isAuthorized(message.member, 'transfer_announce')) {
                return message.reply('❌ Bu komutu kullanma yetkiniz yok!');
            }

            // Kanal kontrolü
            const targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                return message.reply('❌ Lütfen bir kanal etiketleyin!\nKullanım: `.duyur-ayarla #kanal`');
            }

            // Kanalı JSON dosyasına kaydet
            permissions.setRole(message.guild.id, 'announcementChannel', targetChannel.id);

            // Kanalı ayarla
            const setupEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Duyuru Kanalı Ayarlandı`)
                .setDescription(`${targetChannel} artık serbest futbolcu duyuru kanalı olarak ayarlandı!`)
                .addField(
                    {
                        name: '📋 Kullanım',
                        value: 'Artık serbest futbolcular `.duyur` komutu ile bu kanala duyuru gönderebilir.',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter('Transfer Sistemi' );

            await message.reply({ embeds: [setupEmbed] });

            // Test duyurusu gönder
            const testEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} Duyuru Kanalı Aktif`)
                .setDescription('Bu kanal artık serbest futbolcu duyuruları için aktif!')
                .setTimestamp()
                .setFooter('Transfer Sistemi' );

            await targetChannel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('Duyur-ayarla komutu hatası:', error);
            message.reply('❌ Kanal ayarlanırken bir hata oluştu!');
        }
    }
};