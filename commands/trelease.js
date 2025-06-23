const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'trelease',
    description: 'Tek taraflı fesih işlemi başlat',
    async execute(client, message, args) {
        try {
            // Sadece başkanlar kullanabilir
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece başkanlar kullanabilir!');
            }

            // Oyuncu belirtildi mi?
            const playerUser = message.mentions.users.first();
            if (!playerUser) {
                return message.reply('❌ Lütfen fesh edilecek oyuncuyu etiketleyin!\n**Kullanım:** `.trelease @oyuncu`');
            }

            const player = message.guild.members.cache.get(playerUser.id);
            if (!player) {
                return message.reply('❌ Oyuncu bu sunucuda bulunamadı!');
            }

            // Oyuncu kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ Etiketlenen kişi bir oyuncu değil!');
            }

            // Tek taraflı fesih embed'i oluştur
            const releaseEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.release} Tek Taraflı Fesih`)
                .setDescription(`**${message.author.username}** tarafından **${player.user.username}** için tek taraflı fesih talebi:`)
                .addFields(
                    { name: '👑 Başkan', value: `${message.author}`, inline: true },
                    { name: '⚽ Oyuncu', value: `${player}`, inline: true },
                    { name: '📋 Fesih Türü', value: 'Tek Taraflı', inline: true },
                    { name: '⚠️ Uyarı', value: 'Bu işlem geri alınamaz! Oyuncu otomatik olarak serbest futbolcu statüsüne geçer.', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Butonları oluştur
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`release_confirm_${player.id}_${message.author.id}_unilateral`)
                        .setLabel('Onayla')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.emojis.check),
                    new ButtonBuilder()
                        .setCustomId(`release_cancel_${player.id}_${message.author.id}`)
                        .setLabel('İptal Et')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.emojis.cross)
                );

            // Mesajı gönder
            await message.reply({
                content: `${config.emojis.warning} **Tek Taraflı Fesih Talebi**`,
                embeds: [releaseEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('TRelease komutu hatası:', error);
            message.reply('❌ Tek taraflı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};