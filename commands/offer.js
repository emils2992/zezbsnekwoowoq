const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'offer',
    description: 'Serbest futbolcuya teklif gönder',
    usage: '.offer @futbolcu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Futbolcu belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.offer @futbolcu`');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Futbolcu rolü kontrolü
            if (!permissions.isPlayer(targetMember)) {
                return message.reply('❌ Etiketlenen kişi futbolcu değil!');
            }

            // Serbest futbolcu kontrolü
            if (!permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu futbolcu serbest değil! Sadece serbest futbolculara teklif gönderilebilir.');
            }

            // Teklif formu embed'i oluştur
            const offerEmbed = embeds.createOfferForm(message.author, targetUser);
            
            // Butonları oluştur
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`offer_accept_${targetUser.id}_${message.author.id}`)
                        .setLabel('Kabul Et')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.emojis.check),
                    new ButtonBuilder()
                        .setCustomId(`offer_reject_${targetUser.id}_${message.author.id}`)
                        .setLabel('Reddet')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.emojis.cross),
                    new ButtonBuilder()
                        .setCustomId(`offer_edit_${targetUser.id}_${message.author.id}`)
                        .setLabel('Düzenle')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.emojis.edit)
                );

            // Özel müzakere kanalı oluştur
            const negotiationChannel = await channels.createNegotiationChannel(
                message.guild, 
                message.author, 
                targetUser,
                'offer'
            );

            if (!negotiationChannel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Teklifi özel kanala gönder
            const offerMessage = await negotiationChannel.send({
                content: `${config.emojis.football} **Yeni Transfer Teklifi**\n${targetUser}, ${message.author} sizden bir teklif var!`,
                embeds: [offerEmbed],
                components: [row]
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.handshake} Teklif Gönderildi`)
                .setDescription(`${targetUser} için teklifiniz gönderildi!\n\n**Müzakere Kanalı:** ${negotiationChannel}\n\nFutbolcu teklifinizi değerlendirip size geri dönüş yapacak.`)
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [successEmbed] });

            // Futbolcuya bildirim gönder
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`${config.emojis.football} Yeni Transfer Teklifi!`)
                    .setDescription(`**${message.guild.name}** sunucusunda **${message.author.username}** sizden bir teklif geldi!\n\n**Müzakere Kanalı:** ${negotiationChannel}\n\nTeklifinizi değerlendirmek için kanala göz atın.`)
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('DM gönderilemedi:', error.message);
            }

        } catch (error) {
            console.error('Offer komutu hatası:', error);
            message.reply('❌ Teklif gönderilirken bir hata oluştu!');
        }
    }
};
