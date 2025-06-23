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

            // Müzakere kanalı oluştur
            const channel = await channels.createNegotiationChannel(message.guild, message.author, targetUser, 'release');
            if (!channel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Fesih embed'i oluştur
            const releaseEmbed = embeds.createReleaseForm(message.author, targetUser, 'mutual');
            
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`release_accept_${targetUser.id}_${message.author.id}_mutual`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`release_reject_${targetUser.id}_${message.author.id}_mutual`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`release_edit_${targetUser.id}_${message.author.id}_mutual`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await channel.send({
                embeds: [releaseEmbed],
                components: [buttons]
            });

            await message.reply(`✅ Karşılıklı fesih müzakeresi ${channel} kanalında başlatıldı!`);

        } catch (error) {
            console.error('Release komutu hatası:', error);
            message.reply('❌ Karşılıklı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};
