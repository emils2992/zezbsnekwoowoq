const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'release',
    description: 'Karşılıklı fesih işlemi başlat',
    usage: '.release @futbolcu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - hem başkanlar hem serbest futbolcular kullanabilir
            if (!permissions.isPresident(message.member) && !permissions.isFreeAgent(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları ve serbest futbolcular kullanabilir!');
     
            }

            // Futbolcu belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.release @futbolcu`');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Serbest futbolcu kontrolü - serbest futbolcu rolü yeterli
            if (!permissions.isFreeAgent(targetMember) && !permissions.isPlayer(targetMember)) {
                return message.reply('❌ Etiketlenen kişi futbolcu veya serbest futbolcu değil!');
            }

            // Serbest futbolcu kontrolü
            if (permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu futbolcu zaten serbest!');
            }

            // Karşılıklı fesih embed'i oluştur
            const releaseEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.release} Karşılıklı Fesih Teklifi`)
                .setDescription(`**${message.author.username}** tarafından **${targetUser.username}**'e karşılıklı fesih teklifi yapılıyor.`)
                .addFields({ name: '👑 Başkan', value: `${message.author}`, inline: true }, { name: '⚽ Oyuncu', value: `${targetUser}`, inline: true }, { name: '📋 Fesih Türü', value: 'Karşılıklı Anlaşma', inline: true }, { name: '💡 Bilgi', value: 'Fesih detaylarını belirlemek için formu doldurun.', inline: false }).setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Karşılıklı fesih modal formu
            await message.reply({
                content: `${config.emojis.handshake} **Karşılıklı Fesih Teklifi**`,
                embeds: [releaseEmbed],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_release_modal_${targetUser.id}_${message.author.id}_mutual`)
                            .setLabel('Fesih Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('Release komutu hatası:', error);
            message.reply('❌ Karşılıklı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};
