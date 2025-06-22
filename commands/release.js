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
            
            if (releaseType === 'karşılıklı') {
                // Karşılıklı fesih - modal ile ek para detayları al
                await message.reply({
                    content: `${config.emojis.release} **Karşılıklı Fesih Formu**\n\n${targetUser.username} ile karşılıklı fesih detaylarını doldurmak için aşağıdaki butona tıklayın.`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`show_release_modal_${targetUser.id}_${message.author.id}_mutual`)
                                .setLabel('Karşılıklı Fesih Formu Aç')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(config.emojis.edit)
                        )
                    ]
                });
            } else {
                // Tek taraflı fesih - sadece onay/ret
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`release_confirm_${targetUser.id}_${message.author.id}_unilateral`)
                            .setLabel('Evet - Feshi Onayla')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.warning),
                        new ButtonBuilder()
                            .setCustomId(`release_cancel_${targetUser.id}_${message.author.id}`)
                            .setLabel('Hayır - İptal Et')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(config.emojis.cross)
                    );

                await message.reply({
                    content: `${config.emojis.warning} **Tek Taraflı Fesih Onayı**\n\n${message.author}, ${targetUser} ile tek taraflı fesih yapmak istediğinizi onaylıyor musunuz?\n\n**Uyarı:** Bu işlem geri alınamaz ve otomatik duyuru yapılacaktır.`,
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Release komutu hatası:', error);
            message.reply('❌ Fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};
