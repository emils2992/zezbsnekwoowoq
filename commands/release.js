const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'release',
    description: 'Futbolcu feshi',
    usage: '.release @futbolcu [karşılıklı/tek_taraflı]',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Futbolcu belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.release @futbolcu [karşılıklı/tek_taraflı]`');
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
            if (permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu futbolcu zaten serbest!');
            }

            // Fesih türünü belirle
            const releaseType = args[1] && args[1].toLowerCase() === 'tek_taraflı' ? 'tek_taraflı' : 'karşılıklı';
            
            // Fesih formu embed'i oluştur
            const releaseEmbed = embeds.createReleaseForm(message.author, targetUser, releaseType);
            
            if (releaseType === 'karşılıklı') {
                // Karşılıklı fesih - oyuncunun onayı gerekli
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`release_accept_${targetUser.id}_${message.author.id}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`release_reject_${targetUser.id}_${message.author.id}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross)
                    );

                const releaseMessage = await message.channel.send({
                    content: `${config.emojis.release} **Karşılıklı Fesih Teklifi**\n${targetUser}, ${message.author} sizinle karşılıklı fesih yapmak istiyor!`,
                    embeds: [releaseEmbed],
                    components: [row]
                });

                // Futbolcuya bildirim gönder
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle(`${config.emojis.release} Karşılıklı Fesih Teklifi`)
                        .setDescription(`**${message.guild.name}** sunucusunda **${message.author.username}** sizinle karşılıklı fesih yapmak istiyor!\n\nTeklifi değerlendirmek için sunucuya göz atın.`)
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log('DM gönderilemedi:', error.message);
                }

            } else {
                // Tek taraflı fesih - direkt işlem
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`release_confirm_${targetUser.id}_${message.author.id}`)
                            .setLabel('Feshi Onayla')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.warning),
                        new ButtonBuilder()
                            .setCustomId(`release_cancel_${targetUser.id}_${message.author.id}`)
                            .setLabel('İptal Et')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(config.emojis.cross)
                    );

                await message.channel.send({
                    content: `${config.emojis.warning} **Tek Taraflı Fesih**\n${message.author}, ${targetUser} ile tek taraflı fesih yapmak istediğini onaylıyor musun?`,
                    embeds: [releaseEmbed],
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Release komutu hatası:', error);
            message.reply('❌ Fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};
