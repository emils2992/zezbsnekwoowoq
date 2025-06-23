const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'eyardım',
    description: 'Transfer sisteminin tüm komutlarını gösterir',
    usage: '.eyardım',
    
    async execute(client, message, args) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.help || '❓'} Transfer Sistemi Komutları`)
                .setDescription('🏈 **Futbol Transfer Sistemi** - Tüm transfer işlemlerinizi kolayca yönetin!')
                .addFields(
                    {
                        name: `${config.emojis.offer || '💰'} .offer @başkan @futbolcu`,
                        value: 'Bir futbolcu için transfer teklifi gönder',
                        inline: false
                    },
                    {
                        name: `${config.emojis.contract || '📋'} .contract @başkan @futbolcu`,
                        value: 'Sözleşme transfer işlemi başlat',
                        inline: false
                    },
                    {
                        name: `${config.emojis.contract || '📋'} .hire @başkan @futbolcu`,
                        value: 'Kiralık transfer işlemi başlat',
                        inline: false
                    },
                    {
                        name: `${config.emojis.trade || '🔄'} .trade @başkan @futbolcu`,
                        value: 'Takas transfer işlemi başlat',
                        inline: false
                    },
                    {
                        name: `${config.emojis.release || '❌'} .release @futbolcu`,
                        value: 'Futbolcu ile karşılıklı fesih yap',
                        inline: false
                    },
                    {
                        name: `${config.emojis.trelease || '🚫'} .trelease @futbolcu`,
                        value: 'Futbolcuyu tek taraflı fesih et',
                        inline: false
                    },
                    {
                        name: `${config.emojis.settings || '⚙️'} .rol`,
                        value: 'Sistem rollerini ayarla ve görüntüle',
                        inline: false
                    },
                    {
                        name: `${config.emojis.announcement || '📢'} .duyur @futbolcu`,
                        value: 'Manuel transfer duyurusu yap',
                        inline: false
                    },
                    {
                        name: `${config.emojis.settings || '⚙️'} .duyur-ayarla #kanal`,
                        value: 'Otomatik duyuru kanalını ayarla',
                        inline: false
                    },
                    {
                        name: `${config.emojis.settings || '⚙️'} .serbest-ayarla #kanal`,
                        value: 'Serbest oyuncu duyuru kanalını ayarla',
                        inline: false
                    },
                    {
                        name: `${config.emojis.transfer || '📊'} .transfer-duyuru`,
                        value: 'Transfer geçmişi ve istatistikleri',
                        inline: false
                    }
                )
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ 
                    text: 'Transfer Sistemi v2.0 | Otomatik duyuru sistemi aktif',
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Bilgi butonları ekle
            const infoRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('transfer_info_help')
                        .setLabel('Nasıl Kullanılır?')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📖'),
                    new ButtonBuilder()
                        .setCustomId('transfer_roles_help')
                        .setLabel('Rol Sistemi')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('👥'),
                    new ButtonBuilder()
                        .setCustomId('transfer_features_help')
                        .setLabel('Özellikler')
                        .setStyle(ButtonStyle.Success)
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