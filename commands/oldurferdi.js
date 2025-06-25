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
                .setTitle('💀 FERDİ KADIOĞLU BAŞARIYLA ÖLDÜRÜLDÜ!')
                .setDescription('🔫 Ferdi Kadıoğlu eliminasyon işlemi tamamlandı.\n\n**Ölüm Raporu:**\n💉 Enjeksiyon: Tamamlandı\n⚰️ Tabut: Hazırlandı\n🪦 Mezar: Kazıldı')
                .addFields(
                    { name: '📊 İstatistikler', value: '💀 Ölü: 1 adet\n🩸 Kan kaybı: %100\n⏰ Süre: 0.3 saniye', inline: true },
                    { name: '🎯 Hedef', value: 'Ferdi Kadıoğlu (RIP)\n2024-2025', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Troll Sistemi v2.0' });

            const killMessage = await message.reply({ embeds: [killEmbed] });

            // 8 saniye sonra FBI uyarısı
            setTimeout(async () => {
                const fbiEmbed = new MessageEmbed()
                    .setColor('#000080')
                    .setTitle('🚨 FBI UYARISI!')
                    .setDescription('🔍 **SUÇLU TESPİT EDİLDİ**\n\n🎯 Hedef: ' + message.author.username + '\n📍 Konum: Tespit edildi\n🚁 Helikopterler yolda...')
                    .addFields(
                        { name: '⚖️ Suçlar', value: '• Birinci derece cinayet\n• Terör faaliyeti\n• Kitle imha silahı kullanımı', inline: false },
                        { name: '⏰ Tahmini Varış', value: '3 dakika', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'FBI - Federal Soruşturma Bürosu' });

                await killMessage.edit({ embeds: [fbiEmbed] });
            }, 8000);

            // 16 saniye sonra atom bombası
            setTimeout(async () => {
                const bombEmbed = new MessageEmbed()
                    .setColor('#FF4500')
                    .setTitle('☢️ ATOM BOMBASI SALDIRISI BAŞLIYOR!')
                    .setDescription('🚀 **Nükleer başlık aktif!**\n\n💥 Patlamaya: 3... 2... 1...\n☢️ Radyasyon seviyesi: ÖLÜMCÜL\n🌍 Etki alanı: 50km çap')
                    .addFields(
                        { name: '🎯 Hedef Koordinatları', value: 'Latitude: 41.0082\nLongitude: 28.9784\n(İstanbul merkez)', inline: true },
                        { name: '💀 Tahmini Kayıp', value: '15 milyon kişi\n🏢 Binalar: Yok olacak', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Nükleer Komuta Merkezi' });

                await killMessage.edit({ embeds: [bombEmbed] });
            }, 16000);

            // 24 saniye sonra uzaylı istilası
            setTimeout(async () => {
                const alienEmbed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('👽 UZAYLI İSTİLASI!')
                    .setDescription('🛸 **Dünya işgal ediliyor!**\n\n🌍 Gezegen: Ele geçirildi\n👽 Uzaylı sayısı: 50.000.000\n⚡ Lazer silahları: Aktif')
                    .addFields(
                        { name: '📡 Mesaj', value: '"İnsanlar! Ferdi Kadıoğlu\'nu öldürdüğünüz için gezegeninizi ele geçiriyoruz!"', inline: false },
                        { name: '🚀 Ana Gemi', value: 'Uzunluk: 10km\nGenişlik: 5km\nSilah: Ölüm ışını', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Galaktik İmparatorluk' });

                await killMessage.edit({ embeds: [alienEmbed] });
            }, 24000);

            // 32 saniye sonra sunucu patlatma
            setTimeout(async () => {
                const serverEmbed = new MessageEmbed()
                    .setColor('#8B0000')
                    .setTitle('💻 DISCORD SUNUCULARI PATLIYOR!')
                    .setDescription('⚡ **SİSTEM HACKLENİYOR!**\n\n```\nERROR: System failure detected\nDELETING: All user data\nFORMATTING: Database...\nCRASHING: Discord servers...\n```')
                    .addFields(
                        { name: '🔥 Silinen Veriler', value: '💬 Mesajlar: 999.999.999\n👥 Kullanıcılar: Tümü\n🖼️ Resimler: Yok oldu', inline: true },
                        { name: '⚠️ Sistem Durumu', value: '🔴 Kritik hata\n💀 Ölüm sarmalı\n🚨 Panik modu', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Anonymous Hacker Group' });

                await killMessage.edit({ embeds: [serverEmbed] });
            }, 32000);

            // 40 saniye sonra zombie apokalipsi
            setTimeout(async () => {
                const zombieEmbed = new MessageEmbed()
                    .setColor('#654321')
                    .setTitle('🧟‍♂️ ZOMBİ APOKALİPSİ!')
                    .setDescription('🦠 **Ölümün ardından bir virüs başladı!**\n\n🧟‍♂️ Zombie sayısı: 7.8 milyar\n🩸 Enfekte: Tüm dünya\n🏃‍♂️ Kaçış şansı: %0')
                    .addFields(
                        { name: '🦠 Virüs Bilgileri', value: 'Ad: Kadıoğlu-Z1\nBulaşma: Hava yolu\nÖlüm oranı: %100', inline: true },
                        { name: '🌍 Durum Raporu', value: '🏙️ Şehirler: Yıkıldı\n🏥 Hastaneler: İşlevsiz\n🚁 Kurtarma: İmkansız', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Dünya Sağlık Örgütü (Son Rapor)' });

                await killMessage.edit({ embeds: [zombieEmbed] });
            }, 40000);

            // 48 saniye sonra matrix glitch
            setTimeout(async () => {
                const matrixEmbed = new MessageEmbed()
                    .setColor('#00FF41')
                    .setTitle('🔋 MATRİX BOZULUYOR!')
                    .setDescription('```\n01001000 01000101 01001100 01010000\n01001101 01000101\n\nREALITY.exe has stopped working\nSIMULATION CRASHING...\nKADIOGLU_DELETE.bat executed\n\nERROR: Reality not found\n```')
                    .addFields(
                        { name: '🔴 Sistem Mesajı', value: 'Matrix kodu bozuldu\nGerçeklik.exe yanıt vermiyor\nKadıoğlu.dll dosyası silinemiyor', inline: false },
                        { name: '🤖 Agent Smith', value: '"Mr. Anderson... Ferdi Kadıoğlu\'nu neden öldürdün?"', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'The Matrix - System Administrator' });

                await killMessage.edit({ embeds: [matrixEmbed] });
            }, 48000);

            // 56 saniye sonra final mesaj
            setTimeout(async () => {
                const finalEmbed = new MessageEmbed()
                    .setColor('#FFB6C1')
                    .setTitle('😭 ACİL YARDIM!')
                    .setDescription('**"31 çektim pipim ağrıyor yardım edin amk"**\n\n*Ferdi Kadıoğlunun Mezarından gelen son mesaj...*')
                    .addFields(
                        { name: '👻 Ruh Hali', value: 'Çok üzgün ve acı çekiyor', inline: true },
                        { name: '💊 İhtiyaç', value: 'Ağrı kesici ve moral', inline: true },
                        { name: '📞 Acil Hat', value: '0800-KADIOĞLU-SOS', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Ferdi Kadıoğlu\'nun Ruhu - Son Mesaj' });

                await killMessage.edit({ embeds: [finalEmbed] });

                // Özel kanal oluştur
                try {
                    const guild = message.guild;
                    const channelName = `ferdi-kadıoğlu-${message.author.username}`;
                    
                    // Kanal oluştur
                    const specialChannel = await guild.channels.create(channelName, {
                        type: 'GUILD_TEXT',
                        topic: `Ferdi Kadıoğlu özel kanalı - ${message.author.username} tarafından açıldı`,
                        permissionOverwrites: [
                            {
                                id: guild.roles.everyone,
                                allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                                deny: ['SEND_MESSAGES']
                            },
                            {
                                id: message.author.id,
                                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                            }
                        ]
                    });

                    // Uyarı mesajı gönder
                    const warningEmbed = new MessageEmbed()
                        .setColor('#FF0000')
                        .setTitle('⚠️ ÖNEMLİ UYARI!')
                        .setDescription('🚨 **BU KANAL SİLİNMEYECEK!**\n\n🔒 Bu kanal sadece **"ben gayim"** yazdığınızda silinecektir.\n\nBaşka bir şey derseniz:\n💀 **"Aptal mı sandın beni?"**\n🔥 **Sunucu patlatılacak!**')
                        .addFields(
                            { name: '🎯 Hedef Kişi', value: message.author.toString(), inline: true },
                            { name: '⚡ Tehlike Seviyesi', value: 'MAKSIMUM', inline: true },
                            { name: '🕐 Beklenen Süre', value: 'Sonsuz (gay itirafına kadar)', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Ferdi Kadıoğlu Intikam Sistemi' });

                    await specialChannel.send({ embeds: [warningEmbed] });

                    // Kanal mesajlarını dinle - sadece belirtilen kullanıcı
                    const targetUserId = '1005770697303392266'; // Belirtilen kullanıcı ID'si
                    const filter = (msg) => msg.author.id === targetUserId;
                    const collector = specialChannel.createMessageCollector({ filter });
                    
                    let mistakeCount = 0; // Hata sayacı

                    collector.on('collect', async (msg) => {
                        if (msg.content.toLowerCase().includes('ben gayim')) {
                            // Başarı mesajı
                            const successEmbed = new MessageEmbed()
                                .setColor('#00FF00')
                                .setTitle('✅ İTİRAF KABUL EDİLDİ!')
                                .setDescription('🏳️‍🌈 **Tebrikler! Gay itirafınız kaydedildi.**\n\n📝 Ferdi Kadıoğlu\'nun ruhu huzura kavuştu.\n🕊️ Kanal 5 saniye içinde silinecek...')
                                .addFields(
                                    { name: '🎉 Durum', value: 'İtiraf tamamlandı', inline: true },
                                    { name: '👻 Ferdi\'nin Hali', value: 'Artık mutlu', inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Ferdi Kadıoğlu - Huzur Buldu' });

                            await msg.reply({ embeds: [successEmbed] });

                            setTimeout(async () => {
                                try {
                                    await specialChannel.delete('Gay itirafı tamamlandı - Ferdi huzura kavuştu');
                                } catch (error) {
                                    console.error('Kanal silinirken hata:', error);
                                }
                            }, 5000);

                            collector.stop();
                        } else {
                            // Yanlış cevap - artan tehdit seviyeleri
                            mistakeCount++;
                            let threatLevel = '';
                            let threatDescription = '';
                            let footerText = '';
                            
                            switch(mistakeCount) {
                                case 1:
                                    threatLevel = 'APTAL MISIN?! 🗑️ KANAL SİLİNİYOR!';
                                    threatDescription = '🔥 **İLK UYARI!**\n\n<@1005770697303392266> **APTALSINN!**\n\n🗑️ **BİR KANAL SİLİNDİ!** #genel kanalını sildim!\n⚠️ Sadece **"ben gayim"** yaz!\n💀 Başka bir hata yapma yoksa daha fazla kanal silerim!';
                                    footerText = 'Ferdi Kadıoğlu - İlk Uyarı | 1 Kanal Silindi';
                                    break;
                                case 2:
                                    threatLevel = '💣 2 KANAL DAHA SİLİNDİ!';
                                    threatDescription = '🚨 **İKİNCİ HATA!**\n\n<@1005770697303392266> **SEN GERÇEKTEN APTALSIN!**\n\n🗑️ **#muzik ve #oyun kanalları silindi!**\n💣 Sunucu patlatılmaya hazırlanıyor!\n🔥 Bir hata daha yap, 5 kanal birden silerim!';
                                    footerText = 'Ferdi Kadıoğlu - Çok Öfkeli | 3 Kanal Silindi';
                                    break;
                                case 3:
                                    threatLevel = '☢️ 5 KANAL BİRDEN SİLİNDİ!';
                                    threatDescription = '💀 **ÜÇÜNCÜ HATA - SON UYARI!**\n\n<@1005770697303392266> **SEN BİR AHMAKSIN!**\n\n🗑️ **#sohbet #memes #bot #duyuru #kurallar SİLİNDİ!**\n☢️ Nükleer füzeler hazır!\n🌍 Bir hata daha yap TÜM KANALLARI SİLERİM!\n💀 SON ŞANSIN: "ben gayim"';
                                    footerText = 'Ferdi Kadıoğlu - ÖFKE PATLAMASI | 8 Kanal Silindi';
                                    break;
                                case 4:
                                    threatLevel = '🔥 TÜM KANALLAR SİLİNİYOR!';
                                    threatDescription = '💀 **DÖRDÜNCÜ HATA - FELAKET!**\n\n<@1005770697303392266> **SEN TAM BİR DANGALAKIN!**\n\n🗑️ **SUNUCUNUN TÜM KANALLARI SİLİNİYOR!**\n🌊 Tsunami geliyor!\n🌋 Volkanlar patlıyor!\n👽 Uzaylılar saldırıyor!\n🧟‍♂️ Zombiler yürüyor!\n💀 BİR HATA DAHA YAP SUNUCUYU TAMAMEN YOK EDERİM!';
                                    footerText = 'Ferdi Kadıoğlu - MAHŞER GÜNİ | TÜM KANALLAR GİTTİ';
                                    break;
                                default:
                                    threatLevel = '💀 SUNUCU YOK EDİLİYOR!';
                                    threatDescription = '🔥 **ARTIK ÇOK GEÇ!**\n\n<@1005770697303392266> **SEN İNSANLIĞIN EN BÜYÜK APTALISIN!**\n\n💀 **SUNUCU TAMAMEN YOK EDİLİYOR!**\n🗑️ TÜM KANALLAR SİLİNDİ!\n👥 TÜM ÜYELER BANLANACAK!\n🏢 SUNUCU SİLİNECEK!\n🌍 DÜNYA YOK OLACAK!\n💀 SADECE "ben gayim" SENİ VE SUNUCUYU KURTARABİLİR!';
                                    footerText = `Ferdi Kadıoğlu - KIYAMET | ${mistakeCount} HATA YAPILDI`;
                                    break;
                            }

                            const angryEmbed = new MessageEmbed()
                                .setColor('#8B0000')
                                .setTitle(`😡 ${threatLevel}`)
                                .setDescription(threatDescription)
                                .addFields(
                                    { name: '🎯 Doğru Cevap', value: '"ben gayim"', inline: true },
                                    { name: '💣 Hata Sayısı', value: mistakeCount.toString(), inline: true },
                                    { name: '⚡ Tehlike Seviyesi', value: mistakeCount >= 4 ? 'MAHŞER!' : `${mistakeCount}/4`, inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: footerText });

                            await msg.reply({ embeds: [angryEmbed] });
                        }
                    });

                } catch (error) {
                    console.error('Özel kanal oluştururken hata:', error);
                }
            }, 56000);

        } catch (error) {
            console.error('Oldurferdi komutu hatası:', error);
            message.reply('❌ Ferdi öldürülürken bir hata oluştu!');
        }
    }
};