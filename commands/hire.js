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

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 2) {
                return message.reply('❌ Lütfen bir başkan ve bir oyuncu etiketleyin!\nKullanım: `.hire @başkan @oyuncu`');
            }

            // Mentions'ı array'e çevir ve doğru sırayla al
            const mentionsArray = Array.from(mentions.values());
            const targetPresident = mentionsArray[0];
            const playerUser = mentionsArray[1];

            // Debug için log ekle
            console.log('Hire command - Mentions debug:');
            console.log('Total mentions:', mentions.size);
            console.log('First user:', targetPresident.username, targetPresident.id);
            console.log('Second user:', playerUser.username, playerUser.id);

            if (targetPresident.id === playerUser.id) {
                return message.reply('❌ Başkan ve oyuncu farklı kişiler olmalı!');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetPresident.id === message.author.id || playerUser.id === message.author.id) {
                return message.reply('❌ Kendinizi etiketleyemezsiniz!');
            }

            const targetMember = message.guild.members.cache.get(targetPresident.id);
            const player = message.guild.members.cache.get(playerUser.id);

            if (!targetMember || !player) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Hedef başkan kontrolü
            if (!permissions.isPresident(targetMember)) {
                return message.reply('❌ İlk etiketlenen kişi takım başkanı değil!');
            }

            // Futbolcu kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ İkinci etiketlenen kişi futbolcu değil!');
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