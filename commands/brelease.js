const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'brelease',
    description: 'Oyuncunun kendi sözleşmesini karşılıklı feshetmesi',
    usage: '.brelease @başkan',

    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece futbolcular kullanabilir
            if (!permissions.isPlayer(message.member)) {
                return message.reply('❌ Bu komutu sadece futbolcular kullanabilir!');
            }

            // Başkan belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir başkan etiketleyin!\nKullanım: `.brelease @başkan`');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetUser.id === message.author.id) {
                return message.reply('❌ Kendinizi etiketleyemezsiniz!');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Sadece başkanlara fesih teklifi yapılabilir
            if (!permissions.isPresident(targetMember)) {
                return message.reply('❌ Fesih teklifi sadece başkanlara yapılabilir!');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.handshake} **Karşılıklı Fesih Teklifi Formu**\n\n${targetMember.displayName} için fesih formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_brelease_modal_${targetUser.id}_${message.author.id}_mutual`)
                            .setLabel('Fesih Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('BRelease komutu hatası:', error);
            message.reply('❌ Karşılıklı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};