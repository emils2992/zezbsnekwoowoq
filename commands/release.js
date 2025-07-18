const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'release',
    description: 'Karşılıklı fesih işlemi başlat',
    usage: '.release @futbolcu',

    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece başkanlar ve futbolcular kullanabilir
            if (!permissions.isPresident(message.member) && !permissions.isPlayer(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları ve futbolcular kullanabilir!');
            }

            // Futbolcu belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.release @futbolcu`');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetUser.id === message.author.id) {
                return message.reply('❌ Kendinizi serbest bırakamazsınız!');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Sadece futbolculara fesih teklifi yapılabilir (serbest futbolcular yasak)
            if (!permissions.isPlayer(targetMember)) {
                return message.reply('❌ Fesih teklifi sadece futbolculara yapılabilir! Bu oyuncu zaten serbest futbolcu.');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.handshake} **Karşılıklı Fesih Teklifi Formu**\n\n${targetMember.displayName} için fesih formunu doldurmak üzere aşağıdaki butona tıklayın.`,
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