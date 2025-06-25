const { MessageEmbed } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'oldurferdi',
    description: 'Ferdi\'yi öldürür (troll komutu)',
    usage: '.oldurferdi',
    
    async execute(client, message, args) {
        try {
            // İlk mesaj - Ferdi öldürüldü
            const killEmbed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('💀 FERDİ BAŞARIYLA ÖLDÜRÜLDÜ!')
                .setDescription('🔫 Ferdi eliminasyon işlemi tamamlandı.')
                .setTimestamp()
                .setFooter({ text: 'Troll Sistemi' });

            const killMessage = await message.reply({ embeds: [killEmbed] });

            // 2 saniye sonra atom bombası
            setTimeout(async () => {
                const bombEmbed = new MessageEmbed()
                    .setColor('#FF4500')
                    .setTitle('☢️ ATOM BOMBASI SALDIRISI BAŞLIYOR!')
                    .setDescription('🚀 Nükleer başlık hazırlanıyor...\n💥 Patlamaya 3... 2... 1...')
                    .setTimestamp()
                    .setFooter({ text: 'Nükleer Sistem' });

                await killMessage.edit({ embeds: [bombEmbed] });
            }, 2000);

            // 5 saniye sonra sunucu patlatma
            setTimeout(async () => {
                const serverEmbed = new MessageEmbed()
                    .setColor('#8B0000')
                    .setTitle('💻 SUNUCU PATLATMA AYARLARI BAŞLIYOR!')
                    .setDescription('⚡ Sistem hackleniyor...\n🔥 Sunucu dosyaları siliniyor...\n💾 Veritabanı formatlanıyor...')
                    .setTimestamp()
                    .setFooter({ text: 'Hacker Sistemi' });

                await killMessage.edit({ embeds: [serverEmbed] });
            }, 5000);

            // 60 saniye sonra final mesaj
            setTimeout(async () => {
                const finalEmbed = new MessageEmbed()
                    .setColor('#FFB6C1')
                    .setTitle('😭 ACİL YARDIM!')
                    .setDescription('Ferdim pipim ağrıyor yardım et amk')
                    .setTimestamp()
                    .setFooter({ text: 'Ferdi Yardım Sistemi' });

                await killMessage.edit({ embeds: [finalEmbed] });
            }, 60000);

        } catch (error) {
            console.error('Oldurferdi komutu hatası:', error);
            message.reply('❌ Ferdi öldürülürken bir hata oluştu!');
        }
    }
};