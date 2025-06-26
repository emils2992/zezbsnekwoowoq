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
                .setDescription('🏈 **Futbol Transfer Bot Rehberi**\n\nTüm transfer işlemlerinizi kolayca yönetin! Bot interaktif formlar ve butonlarla çalışır.\n\n**YENİ:** Ekonomi sistemi ve transfer listesi ile oyuncularınızı yönetin!')
                .addFields(
                    { name: '⚽ Transfer Komutları', value: '`.offer @oyuncu` - Serbest oyuncuya teklif\n`.contract @başkan @oyuncu` - Sözleşme transferi\n`.trade @başkan @istenen @verilen` - Takas\n`.hire @başkan @oyuncu` - Kiralık transfer\n`.release @oyuncu` - Karşılıklı fesih\n`.trelease @oyuncu` - Tek taraflı fesih\n`.brelease` - Oyuncunun fesih talebi\n`.btrelease` - Oyuncunun tek taraflı fesih', inline: false },
                    { name: '💰 Ekonomi Sistemi', value: '`.pay @kullanıcı miktar` - Para gönder\n`.work` - Çalışarak para kazan (1dk cooldown)\n`.balance [@kullanıcı]` - Para durumunu gör\n`.deposit miktar` - Bankaya para yatır\n`.tk miktar` - Bankadan para çek\n`.lb [sayfa]` - Zenginlik sıralaması\n\n**Para Formatları:** 5k, 5e3, 5K = 5000', inline: false },
                    { name: '🛍️ Mağaza Sistemi', value: '`.shop` - Mağazayı göster\n`.shop add emoji ürün fiyat [evler]` - Ürün ekle (Yetkililer)\n`.shop remove ürün` - Ürün sil (Yetkililer)\n`.buy ürün_adı` - Ürün satın al\n`.cv [@kullanıcı]` - Envanter ve para durumu\n\n**🏠 Ev Sistemi:** Sadece 1 ev sahibi olabilirsiniz!\n**Yönetim:**\n`.add @kullanıcı miktar` - Para ekle (Yetkililer)\n`.remove @kullanıcı miktar` - Para çıkar (Yetkililer)\n`.elog #kanal` - Ekonomi log kanalı ayarla', inline: false },
                    { name: '📋 Transfer Listesi', value: '`.bduyur @oyuncu` - Oyuncuyu transfer listesine koy\n`.bduyur-ayarla` - Transfer listesi kanalı ayarla\n\n**Nasıl Çalışır:**\n• Başkan oyuncuyu listeye koyar\n• Oyuncu kabul/red/düzenle yapabilir\n• Kabul edilen duyurulur\n• Diğer başkanlar `.contract` ile iletişim kurar', inline: false },
                    { name: '⚙️ Transfer Dönemi', value: '`.ac` - Transfer dönemini aç (Yönetici)\n`.kapa` - Transfer dönemini kapat (Yönetici)\n\n*Transfer kapalıyken .hire, .contract, .trade çalışmaz*\n\n**🔒 Transfer Takip Sistemi:**\nOyuncular dönem başına sadece 1 kez transfer edilebilir (.offer, .contract, .trade)\n`.hire` komutu (kiralık) her zaman kullanılabilir\n`.ac` komutu transfer kayıtlarını sıfırlar', inline: false },
                    { name: '📢 Duyuru Sistemi', value: '`.duyur` - Serbest oyuncu duyurusu\n`.transfer-duyuru` - Transfer duyuru kanalı ayarla\n`.serbest-ayarla` - Serbest duyuru kanalı ayarla\n`.duyur-ayarla` - Manuel duyuru kanalı ayarla', inline: false },
                    { name: '🎭 Rol Yönetimi', value: '`.rol` - Rol yönetim menüsü\n\n**Rol Türleri:**\n• Başkan - Transfer yapabilir\n• Futbolcu - Transfer edilebilir\n• Serbest Futbolcu - Teklif alabilir\n• Transfer Yetkili - Transfer onaylayabilir\n• Ping Rolleri - Duyuru bildirimleri', inline: false },
                    { name: '📊 Transfer Takip', value: '`.tf` - Transfer geçmişini listele\n`.yt` - Son transferler (Yetkililer)\n`.tfreset` - Transfer kayıtlarını sıfırla (Yetkililer)', inline: false },
                    { name: '🕴️ Yasadışı Hizmetler', value: '`.illegal` - Yasadışı hizmetler menüsü\n`.illegal escort` - Escort çağır (50k)\n`.illegal hitman` - Tetikçi kirala (200k) 🏠\n`.illegal drugs` - Uyuşturucu sat (75k) 🏠\n`.illegal weapons` - Silah kaçakçılığı (150k) 🏠\n`.illegal money_laundry` - Para akla (100k) 🏠\n`.illegal casino` - Kumarhane aç (300k) 🏠\n\n🏠 = Ev gerekli | Bazı hizmetler bonus kazanç verir!', inline: false },
                    { name: '🔧 Diğer', value: '`.cleanup` - Eski kanalları temizle\n`.log #kanal` - Global log kanalı ayarla (Gizli)\n`.eyardım` - Bu yardım menüsü\n`.transferstatus @oyuncu` - Transfer durumu kontrol (Yetkililer)', inline: false }
                )
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Transfer sistemi v2.0 - Transfer listesi sistemi dahil!' })
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