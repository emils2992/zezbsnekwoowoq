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

            const player = message.author; // Komutu kullanan oyuncu
            const playerMember = message.member;

            // Tek taraflı fesih embed'i oluştur - basit onay/iptal sistemi
            const releaseEmbed = new MessageEmbed()
                .setTitle(`${config.emojis.warning} Tek Taraflı Fesih Talebi`)
                .setDescription(`**${playerMember.displayName}** sözleşmesini tek taraflı feshetmek istiyor.`)
                .setColor(config.colors.danger)
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .addField('📋 Durum', 'Onay bekleniyor', true)
                .addField('⚽ Oyuncu', playerMember.displayName, true)
                .addField('📅 Tarih', new Date().toLocaleDateString('tr-TR'), true)
                .setFooter({ text: 'Bu işlem geri alınamaz!' })
                .setTimestamp();

            // Butonları oluştur - sadece onayla/iptal
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`brelease_confirm_${player.id}_${player.id}_unilateral`)
                        .setLabel('Onayla ve Feshet')
                        .setStyle('DANGER')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`brelease_cancel_${player.id}_${player.id}_unilateral`)
                        .setLabel('İptal Et')
                        .setStyle('SECONDARY')
                        .setEmoji('❌')
                );

            // Mesajı gönder
            await message.reply({
                content: `${config.emojis.warning} **Tek Taraflı Fesih Talebi**\n\n⚠️ Bu işlem geri alınamaz! Onayladığınızda sözleşmeniz feshedilecek ve serbest futbolcu olacaksınız.`,
                embeds: [releaseEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('BTRelease komutu hatası:', error);
            message.reply('❌ Tek taraflı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};