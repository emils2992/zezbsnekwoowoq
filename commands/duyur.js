const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
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

            // Doğrudan duyuru formu talimatları göster
            await message.reply({
                content: `${config.emojis.football} **Serbest Futbolcu Duyuru Formu**\n\nLütfen duyuru bilgilerinizi şu formatta yazın:\n\`\`\`\nOyuncu: [Oyuncu Adı]\nYeni Kulüp: [Kulüp Adı]\nMaaş: [Maaş Bilgisi]\nSözleşme: [Süre]\nBonus: [Bonus Bilgisi]\n\`\`\`\n\nÖrnek:\n\`\`\`\nOyuncu: Lionel Messi\nYeni Kulüp: Galatasaray\nMaaş: 6.000.000₺/yıl\nSözleşme: 2 yıl\nBonus: 250.000₺\n\`\`\`\n\nBu mesajı yanıtlayarak duyurunuzu gönderin.`,
                ephemeral: false
            });

        } catch (error) {
            console.error('Duyur komutu hatası:', error);
            message.reply('❌ Duyuru oluşturulurken bir hata oluştu!');
        }
    }
};