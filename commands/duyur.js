const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');

module.exports = {
    name: 'duyur',
    description: 'Manuel transfer duyurusu yap',
    usage: '.duyur',
    
    async execute(client, message, args) {
        try {
            // Serbest futbolcu rolü kontrolü
            if (!permissions.isFreeAgent(message.member)) {
                return message.reply('❌ Bu komutu sadece serbest futbolcular kullanabilir!');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.announcement || '📢'} **Manuel Transfer Duyurusu**\n\nDuyuru formunu doldurmak için aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_announcement_modal_${message.author.id}`)
                            .setLabel('Duyuru Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji('📢')
                    )
                ]
            });

        } catch (error) {
            console.error('Duyur komutu hatası:', error);
            message.reply('❌ Duyuru oluşturulurken bir hata oluştu!');
        }
    }
};