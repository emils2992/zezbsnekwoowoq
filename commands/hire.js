const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'hire',
    description: 'Kiralık transfer işlemi başlat',
    usage: '.hire @hedefbaşkan @futbolcu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Hedef başkan kontrolü
            const targetPresident = message.mentions.users.first();
            if (!targetPresident) {
                return message.reply('❌ Lütfen bir hedef başkan etiketleyin!\nKullanım: `.hire @hedefbaşkan @futbolcu`');
            }

            // Futbolcu kontrolü
            const playerUser = message.mentions.users.at(1);
            if (!playerUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.hire @hedefbaşkan @futbolcu`');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetPresident === message.author.id || playerUser.id === message.author.id) {
                return message.reply('❌ Kendinizi etiketleyemezsiniz!');
            }

            const targetMember = message.guild.members.cache.get(targetPresident.id);
            const player = message.guild.members.cache.get(playerUser.id);

            if (!targetMember || !player) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Hedef başkan kontrolü
            if (!permissions.isPresident(targetMember)) {
                return message.reply('❌ Etiketlenen kişi bir başkan değil!');
            }

            // Futbolcu kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ Etiketlenen kişi bir futbolcu değil!');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.contract} **Kiralık Sözleşme Teklifi Formu**\n\n${playerUser.username} için kiralık formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_hire_modal_${playerUser.id}_${message.author.id}`)
                            .setLabel('Kiralık Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('Hire komutu hatası:', error);
            message.reply('❌ Kiralık sözleşme işlemi başlatılırken bir hata oluştu!');
        }
    }
};