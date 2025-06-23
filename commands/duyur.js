const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');

module.exports = {
    name: 'duyur',
    description: 'Serbest futbolcu duyurusu yap',
    usage: '.duyur',
    
    async execute(client, message, args) {
        try {
            // Serbest futbolcu rolü kontrolü
            if (!permissions.isFreeAgent(message.member)) {
                return message.reply('❌ Bu komutu sadece serbest futbolcular kullanabilir!');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.football} **Serbest Futbolcu Duyuru Formu**\n\nKendi duyurunuzu oluşturmak için aşağıdaki butona tıklayın.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`show_announcement_modal_${message.author.id}`)
                            .setLabel('Duyuru Formu Aç')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('Duyur komutu hatası:', error);
            message.reply('❌ Duyuru oluşturulurken bir hata oluştu!');
        }
    }
};