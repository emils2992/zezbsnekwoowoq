const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'eyardım',
    description: 'Bot komutlarının yardım menüsünü gösterir',
    usage: '.eyardım',
    
    async execute(client, message, args) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} Transfer Bot Yardım Menüsü`)
                .setDescription('Futbol transfer sisteminin tüm komutları ve kullanımları:')
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '⚽ Transfer Komutları',
                        value: '`.offer @futbolcu` - Serbest futbolcuya teklif gönder\n' +
                               '`.contract @başkan @futbolcu` - Başkanlar arası sözleşme\n' +
                               '`.trade @başkan @futbolcu` - Futbolcu takası\n' +
                               '`.release @futbolcu` - Karşılıklı fesih\n' +
                               '`.trelease @futbolcu` - Tek taraflı fesih',
                        inline: false
                    },
                    {
                        name: '📢 Duyuru Komutları',
                        value: '`.duyur` - Serbest futbolcu kendi duyurusunu yap\n' +
                               '`.duyur-ayarla #kanal` - Duyuru kanalını ayarla\n' +
                               '`.serbest-ayarla #kanal` - Serbest futbolcu kanalını ayarla\n' +
                               '`.transfer-duyuru #kanal` - Transfer duyuru kanalını ayarla',
                        inline: false
                    },
                    {
                        name: '🔧 Yönetim Komutları',
                        value: '`.rol` - Rol ayarlama menüsü\n' +
                               '`.rol liste` - Mevcut rolleri göster\n' +
                               '`.rol sıfırla` - Tüm rol ayarlarını sıfırla',
                        inline: false
                    },
                    {
                        name: '📋 Nasıl Çalışır?',
                        value: '1️⃣ **Roller ayarlanır**: Başkan, Futbolcu, Serbest Futbolcu rolleri\n' +
                               '2️⃣ **Kanallar ayarlanır**: Duyuru kanalları belirlenir\n' +
                               '3️⃣ **Transferler başlar**: Modal formlarla teklif/sözleşme/takas\n' +
                               '4️⃣ **Müzakereler**: Özel kanallarda görüşmeler\n' +
                               '5️⃣ **Duyurular**: Kabul edilen transferler otomatik duyurulur',
                        inline: false
                    },
                    {
                        name: '💡 İpuçları',
                        value: '• Tüm formlar zorunlu alanlar içerir\n' +
                               '• Müzakere kanalları 24 saat sonra silinir\n' +
                               '• Transfer yetkilileri tüm müzakereleri görebilir\n' +
                               '• Serbest futbolcular kendi duyurularını yapabilir\n' +
                               '• Boş bırakılan alanlar duyurularda gözükmez',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Transfer Sistemi v2.0 | Komut öneki: .', 
                    iconURL: message.guild.iconURL() 
                });

            await message.reply({ embeds: [helpEmbed] });

        } catch (error) {
            console.error('Yardım komutu hatası:', error);
            message.reply('❌ Yardım menüsü gösterilirken bir hata oluştu!');
        }
    }
};