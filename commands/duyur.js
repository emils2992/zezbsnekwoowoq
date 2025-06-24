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
            const reply = await message.reply({
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

            // Mesajı 5 saniye sonra sil
            setTimeout(async () => {
                try {
                    if (reply.deletable) {
                        await reply.delete();
                        console.log('✅ Announcement form button message deleted after 5 seconds');
                    }
                } catch (error) {
                    console.log('Could not delete announcement button message:', error.message);
                }
            }, 5000);

        } catch (error) {
            console.error('Duyur komutu hatası:', error);
            message.reply('❌ Duyuru oluşturulurken bir hata oluştu!');
        }
    }
};