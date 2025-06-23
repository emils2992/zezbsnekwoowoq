const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'eyardım',
    description: 'Transfer sisteminin tüm komutlarını gösterir',
    usage: '.eyardım',
    
    async execute(client, message, args) {
        try {
            const helpEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.help || '❓'} Transfer Sistemi Komutları`)
                .setDescription('🏈 **Futbol Transfer Sistemi** - Tüm transfer işlemlerinizi kolayca yönetin!')
                .addField(`${config.emojis.offer || '💰'} .offer @başkan @futbolcu`, 'Bir futbolcu için transfer teklifi gönder', false)
                .addField(`${config.emojis.contract || '📋'} .contract @başkan @futbolcu`, 'Sözleşme transfer işlemi başlat', false)
                .addField(`${config.emojis.contract || '📋'} .hire @başkan @futbolcu`, 'Kiralık transfer işlemi başlat', false)
                .addField(`${config.emojis.trade || '🔄'} .trade @başkan @futbolcu`, 'Takas transfer işlemi başlat', false)
                .addField(`${config.emojis.release || '❌'} .release @futbolcu`, 'Futbolcu ile karşılıklı fesih yap', false)
                .addField(`${config.emojis.trelease || '🚫'} .trelease @futbolcu`, 'Futbolcuyu tek taraflı fesih et', false)
                .addField(`${config.emojis.settings || '⚙️'} .rol`, 'Sistem rollerini ayarla ve görüntüle', false)
                .addField(`${config.emojis.announcement || '📢'} .duyur @futbolcu`, 'Manuel transfer duyurusu yap', false)
                .addField(`${config.emojis.settings || '⚙️'} .duyur-ayarla #kanal`, 'Otomatik duyuru kanalını ayarla', false)
                .addField(`${config.emojis.settings || '⚙️'} .serbest-ayarla #kanal`, 'Serbest oyuncu duyuru kanalını ayarla', false)
                .addField(`${config.emojis.transfer || '📊'} .transfer-duyuru`, 'Transfer geçmişi ve istatistikleri', false)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Transfer Sistemi v2.0 | Otomatik duyuru sistemi aktif' })
                .setTimestamp();

            // Bilgi butonları ekle
            const infoRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('transfer_info_help')
                        .setLabel('Nasıl Kullanılır?')
                        .setStyle('PRIMARY')
                        .setEmoji('📖'),
                    new MessageButton()
                        .setCustomId('transfer_roles_help')
                        .setLabel('Rol Sistemi')
                        .setStyle('SECONDARY')
                        .setEmoji('👥'),
                    new MessageButton()
                        .setCustomId('transfer_features_help')
                        .setLabel('Özellikler')
                        .setStyle('SUCCESS')
                        .setEmoji('⚡')
                );

            await message.reply({ 
                embeds: [helpEmbed],
                components: [infoRow]
            });

        } catch (error) {
            console.error('Eyardım komutu hatası:', error);
            message.reply('❌ Yardım menüsü gösterilirken bir hata oluştu!');
        }
    }
};