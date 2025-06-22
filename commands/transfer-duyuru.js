const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const api = require('../utils/api');

module.exports = {
    name: 'transfer-duyuru',
    description: 'Transfer duyurusu yap',
    usage: '.transfer-duyuru #kanal @futbolcu "takım_adı" "transfer_türü" "miktar"',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isAuthorized(message.member, 'transfer_announce')) {
                return message.reply('❌ Bu komutu kullanma yetkiniz yok!');
            }

            // Kanal kontrolü
            const targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                return message.reply('❌ Lütfen bir kanal etiketleyin!\nKullanım: `.transfer-duyuru #kanal @futbolcu "takım_adı" "transfer_türü" "miktar"`');
            }

            // Futbolcu kontrolü
            const playerUser = message.mentions.users.first();
            if (!playerUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!');
            }

            // Argümanları parse et
            const argsString = args.join(' ');
            const quoteMatches = argsString.match(/"([^"]*)"/g);
            
            if (!quoteMatches || quoteMatches.length < 2) {
                return message.reply('❌ Lütfen takım adı ve transfer türünü tırnak içinde belirtin!\nÖrnek: `.transfer-duyuru #duyurular @oyuncu "Galatasaray" "transfer" "5000000"`');
            }

            const teamName = quoteMatches[0].replace(/"/g, '');
            const transferType = quoteMatches[1].replace(/"/g, '');
            const amount = quoteMatches[2] ? quoteMatches[2].replace(/"/g, '') : '0';

            // Transfer türü kontrolü
            const validTypes = ['transfer', 'takas', 'serbest_transfer', 'fesih'];
            if (!validTypes.includes(transferType.toLowerCase())) {
                return message.reply(`❌ Geçersiz transfer türü! Geçerli türler: ${validTypes.join(', ')}`);
            }

            // Futbolcu yüzü API'sinden resim al
            const playerImageUrl = await api.getPlayerFace();

            // Transfer duyuru embed'i oluştur
            const announcementEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} RESMİ TRANSFER DUYURUSU`)
                .setDescription(`**${playerUser.username}** oyuncusu ile ilgili transfer işlemi tamamlandı!`)
                .addFields(
                    {
                        name: `${config.emojis.handshake} Oyuncu`,
                        value: `${playerUser}`,
                        inline: true
                    },
                    {
                        name: `🏆 Takım`,
                        value: teamName,
                        inline: true
                    },
                    {
                        name: `📋 İşlem Türü`,
                        value: transferType.charAt(0).toUpperCase() + transferType.slice(1),
                        inline: true
                    }
                )
                .setThumbnail(playerImageUrl)
                .setTimestamp()
                .setFooter({ 
                    text: 'Transfer Sistemi', 
                    iconURL: message.guild.iconURL() 
                });

            // Miktar bilgisi ekle (eğer varsa)
            if (amount && amount !== '0') {
                announcementEmbed.addFields({
                    name: `${config.emojis.money} Transfer Bedeli`,
                    value: `${parseInt(amount).toLocaleString('tr-TR')}₺`,
                    inline: true
                });
            }

            // Transfer türüne göre renk ve açıklama ayarla
            switch (transferType.toLowerCase()) {
                case 'transfer':
                    announcementEmbed.setColor(config.colors.success);
                    break;
                case 'takas':
                    announcementEmbed.setColor(config.colors.accent);
                    break;
                case 'serbest_transfer':
                    announcementEmbed.setColor(config.colors.primary);
                    break;
                case 'fesih':
                    announcementEmbed.setColor(config.colors.error);
                    break;
            }

            // Duyuruyu hedef kanala gönder
            const announcementMessage = await targetChannel.send({
                content: `🎉 **YENİ TRANSFER DUYURUSU** 🎉`,
                embeds: [announcementEmbed]
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Transfer Duyurusu Gönderildi`)
                .setDescription(`${playerUser.username} için transfer duyurusu ${targetChannel} kanalına gönderildi!`)
                .addFields(
                    {
                        name: 'Mesaj Linki',
                        value: `[Duyuruyu Görüntüle](${announcementMessage.url})`,
                        inline: false
                    }
                )
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Transfer-duyuru komutu hatası:', error);
            message.reply('❌ Transfer duyurusu gönderilirken bir hata oluştu!');
        }
    }
};
