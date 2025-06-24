const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'btrelease',
    description: 'Oyuncunun kendi sözleşmesini tek taraflı feshetmesi',
    usage: '.btrelease',

    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece futbolcular kullanabilir
            if (!permissions.isPlayer(message.member)) {
                return message.reply('❌ Bu komutu sadece futbolcular kullanabilir!');
            }

            const player = message.member;
            const president = message.author; // Komutu kullanan kişi

            // Tek taraflı fesih embed'i oluştur
            const releaseEmbed = embeds.createReleaseForm(president, player.user, 'unilateral');
            
            releaseEmbed
                .setTitle(`${config.emojis.warning} Tek Taraflı Fesih Talebi`)
                .setDescription(`**${player.displayName}** sözleşmesini tek taraflı feshetmek istiyor.`)
                .setColor(config.colors.danger)
                .setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Transfer Sistemi' });

            // Butonları oluştur
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`brelease_confirm_${player.id}_${message.author.id}_unilateral`)
                        .setLabel('Onayla')
                        .setStyle('DANGER')
                        .setEmoji(config.emojis.check),
                    new MessageButton()
                        .setCustomId(`brelease_cancel_${player.id}_${message.author.id}`)
                        .setLabel('İptal Et')
                        .setStyle('SECONDARY')
                        .setEmoji(config.emojis.cross)
                );

            // Mesajı gönder
            await message.reply({
                content: `${config.emojis.warning} **Tek Taraflı Fesih Talebi**`,
                embeds: [releaseEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('BTRelease komutu hatası:', error);
            message.reply('❌ Tek taraflı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};