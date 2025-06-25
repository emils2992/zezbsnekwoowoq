const { MessageEmbed } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'oldurferdi',
    description: 'Ferdi\'yi öldürür (troll komutu)',
    usage: '.oldurferdi',
    
    async execute(client, message, args) {
        try {
            // Kullanım verilerini kontrol et
            const dataPath = path.join(__dirname, '..', 'data', 'oldurferdi.json');
            let usageData = { globalUsed: false, usedBy: null };
            
            // JSON dosyasını oku
            try {
                if (fs.existsSync(dataPath)) {
                    const fileContent = fs.readFileSync(dataPath, 'utf8');
                    usageData = JSON.parse(fileContent);
                }
            } catch (error) {
                console.error('Oldurferdi data okuma hatası:', error);
            }
            
            // Global olarak kullanıldı mı kontrol et
            if (usageData.globalUsed) {
                const alreadyUsedEmbed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('⛔ FERDİ ZATEN ÖLDÜRÜLDÜ!')
                    .setDescription(`**Bu komut zaten kullanıldı!**\n\n🚫 Ferdi Kadıoğlu sadece bir kez öldürülebilir!\n👻 Ruhu artık sessiz...\n\n💀 **Katil:** <@${usageData.usedBy}>`)
                    .addFields(
                        { name: '💀 Durum', value: 'Ferdi zaten ölü', inline: true },
                        { name: '🔒 Kısıtlama', value: 'Global tek kullanım', inline: true },
                        { name: '⚰️ Son Sözler', value: 'Ferdi artık huzur içinde...', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Ferdi Kadıoğlu - Ebedi Huzur' });
                
                const rejectionReply = await message.reply({ embeds: [alreadyUsedEmbed] });
                
                // 5 saniye sonra mesajı sil
                setTimeout(async () => {
                    try {
                        await rejectionReply.delete();
                    } catch (error) {
                        console.error('Rejection mesajı silinirken hata:', error);
                    }
                }, 5000);
                
                return;
            }
            
            // Global kullanımı işaretle
            usageData.globalUsed = true;
            usageData.usedBy = message.author.id;
            
            // JSON dosyasını güncelle
            try {
                fs.writeFileSync(dataPath, JSON.stringify(usageData, null, 2));
            } catch (error) {
                console.error('Oldurferdi data yazma hatası:', error);
            }

            // İlk mesaj - Ferdi öldürüldü
            const killEmbed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('💀 FERDİ KADIOĞLU BAŞARIYLA ÖLDÜRÜLDÜ!')
                .setDescription('🔫 Ferdi Kadıoğlu eliminasyon işlemi tamamlandı.\n\n**Ölüm Raporu:**\n💉 Enjeksiyon: Tamamlandı\n⚰️ Tabut: Hazırlandı\n🪦 Mezar: Kazıldı')
                .addFields(
                    { name: '💀 Katil', value: message.author.toString(), inline: true },
                    { name: '⏰ Ölüm Saati', value: new Date().toLocaleTimeString('tr-TR'), inline: true },
                    { name: '🎯 Hedef', value: 'Ferdi Kadıoğlu', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Ferdi Kadıoğlu - Son Nefes' });

            await message.reply({ embeds: [killEmbed] });

            // 7 aşamalı troll dizisi (8 saniye aralıklarla)
            const stages = [
                {
                    title: '👻 FERDİ\'NİN RUHU UYANDIRILDI!',
                    description: '🚨 **HADİ BAKALIM NE YAPACAKSIN!**\n\n💀 Ferdi Kadıoğlu\'nun ruhu öbür dünyadan geri döndü!\n👻 O artık seni hedef aldı!\n🔥 Intikam almak için geri geldi!',
                    color: '#8B0000'
                },
                {
                    title: '⚡ FERDİ İNTİKAM ALIYOR!',
                    description: '🌪️ **FERDİ ÇILDIRDI!**\n\n💀 Ferdi Kadıoğlu ruhen seni takip ediyor!\n👻 Her adımını izliyor!\n🔪 İntikamını planlatıyor!',
                    color: '#4B0082'
                },
                {
                    title: '🔥 FERDİ GAZAPLANIYOR!',
                    description: '🌋 **VOLKAN GİBİ PATLIYOR!**\n\n💀 Ferdi\'nin gazabı yeryüzünü sallıyor!\n⚡ Şimşekler çakıyor!\n🌪️ Kasırgalar kopuyor!',
                    color: '#FF4500'
                },
                {
                    title: '💥 FERDİ ŞEYTANLAŞTI!',
                    description: '👹 **ARTIK ŞEYTANDİR!**\n\n💀 Ferdi cehennemden güç alıyor!\n🔥 Ateş nefes veriyor!\n👺 Korkunç bir canavar oldu!',
                    color: '#DC143C'
                },
                {
                    title: '🌪️ FERDİ KIYAMETI KOPARACAK!',
                    description: '☄️ **DÜNYA SONUNU GETİRİYOR!**\n\n💀 Ferdi kıyameti başlatıyor!\n🌍 Dünya titriyor!\n⚡ Gökyüzü yanıyor!',
                    color: '#8B008B'
                },
                {
                    title: '👑 FERDİ TANRI OLDU!',
                    description: '⚡ **YENİ TANRI FERDİ!**\n\n💀 Ferdi artık her şeyin efendisi!\n🌟 Sonsuz güce sahip!\n👑 Evrenin kralı!',
                    color: '#FFD700'
                },
                {
                    title: '🎭 FERDİ SENİ BEKLEYEN ÖZEL BİR KANAL AÇACAK!',
                    description: '🎪 **SON SAHNE!**\n\n💀 Ferdi sana özel bir sürpriz hazırladı!\n🎭 Özel kanal açılıyor!\n🎪 Show time!',
                    color: '#FF69B4'
                }
            ];

            // Her 8 saniyede bir stage göster
            for (let i = 0; i < stages.length; i++) {
                setTimeout(async () => {
                    const stageEmbed = new MessageEmbed()
                        .setColor(stages[i].color)
                        .setTitle(stages[i].title)
                        .setDescription(stages[i].description)
                        .addFields(
                            { name: '⚡ Aşama', value: `${i + 1}/7`, inline: true },
                            { name: '⏰ Süre', value: `${(i + 1) * 8} saniye`, inline: true },
                            { name: '🎯 Hedef', value: 'Ferdi Kadıoğlu İntikamı', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Ferdi Kadıoğlu - Aşama ${i + 1}` });

                    await message.reply({ embeds: [stageEmbed] });
                }, i * 8000);
            }

            // Son aşamada özel kanal oluştur (56 saniye sonra)
            setTimeout(async () => {
                try {
                    const guild = message.guild;
                    const channelName = `ferdi-kadıoğlu-${message.author.username}`;
                    
                    // Özel kanal oluştur
                    const specialChannel = await guild.channels.create(channelName, {
                        type: 'GUILD_TEXT',
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
                            { name: '🎯 Hedef Kişi', value: '<@1005770697303392266>', inline: true },
                            { name: '⚡ Tehlike Seviyesi', value: 'MAKSIMUM', inline: true },
                            { name: '🕐 Beklenen Süre', value: 'Sonsuz (gay itirafına kadar)', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Ferdi Kadıoğlu Intikam Sistemi' });

                    await specialChannel.send({ content: '@here', embeds: [warningEmbed] });

                    // Her 10 saniyede bir hedef kullanıcıyı etiketle
                    const reminderInterval = setInterval(async () => {
                        try {
                            if (specialChannel && !specialChannel.deleted) {
                                const reminderMessages = [
                                    '⏰ **HATIRLAT!** <@1005770697303392266> **"ben gayim"** yazmayı unutma!',
                                    '🚨 **DİKKAT!** <@1005770697303392266> Ferdi bekliyor... **"ben gayim"** yaz!',
                                    '💀 **UYARI!** <@1005770697303392266> Zaman geçiyor! **"ben gayim"** de!',
                                    '🔥 **ACELE ET!** <@1005770697303392266> **"ben gayim"** yazmazsan felaket olacak!',
                                    '👻 **FERDİ ÇAĞIRIYOR!** <@1005770697303392266> **"ben gayim"** demelisin!',
                                    '⚡ **SON ŞANS!** <@1005770697303392266> **"ben gayim"** yaz yoksa...!',
                                    '🌋 **VOLKAN PATLAYACAK!** <@1005770697303392266> Çabuk **"ben gayim"** de!',
                                    '💥 **NÜKLEER ALARM!** <@1005770697303392266> **"ben gayim"** yazana kadar durmayacağım!',
                                    '🌪️ **KASIRGA GELİYOR!** <@1005770697303392266> **"ben gayim"** diye bağır!',
                                    '🔮 **KIYAMET YAKLAŞIYOR!** <@1005770697303392266> **"ben gayim"** yazmazsan dünya yok olacak!',
                                    '⚡ **ŞIMŞEK ÇARPACAK!** <@1005770697303392266> **"ben gayim"** de yoksa Zeus seni bulacak!',
                                    '🦖 **DİNOZORLAR CANLIYOR!** <@1005770697303392266> **"ben gayim"** yazarak onları durdur!',
                                    '🛸 **UZAYLILAR SALDIRIYOR!** <@1005770697303392266> **"ben gayim"** de ki dünyayı kurtarasın!',
                                    '🐉 **EJDER UYANACAK!** <@1005770697303392266> **"ben gayim"** diyerek büyüyü boz!',
                                    '⚰️ **ZOMBILER YAKLAŞIYOR!** <@1005770697303392266> **"ben gayim"** de ki güvende kalasın!',
                                    '🌊 **TSUNAMI GELİYOR!** <@1005770697303392266> **"ben gayim"** yazarak tsunamiyi durdur!',
                                    '🔥 **CEHENNEM AÇILIYOR!** <@1005770697303392266> **"ben gayim"** de ki kapıları kapatsın!',
                                    '💀 **ÖLÜM MELEĞI YAKLAŞIYOR!** <@1005770697303392266> **"ben gayim"** yazarak canını kurtar!',
                                    '🌑 **GÜNEŞ SÖNECEK!** <@1005770697303392266> **"ben gayim"** de ki ışık geri gelsin!',
                                    '❄️ **BUZ ÇAĞI BAŞLAYACAK!** <@1005770697303392266> **"ben gayim"** yazarak ısınmayı sağla!'
                                ];
                                
                                const randomMessage = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
                                await specialChannel.send(randomMessage);
                            } else {
                                clearInterval(reminderInterval);
                            }
                        } catch (error) {
                            console.error('Reminder mesaj hatası:', error);
                            clearInterval(reminderInterval);
                        }
                    }, 10000); // Her 10 saniye

                    // Mesaj toplayıcı - sadece hedef kullanıcının mesajlarını dinle
                    const filter = (msg) => msg.author.id === '1005770697303392266';
                    const collector = specialChannel.createMessageCollector({ filter, time: 0 });

                    let mistakeCount = 0;

                    collector.on('collect', async (msg) => {
                        if (msg.content.toLowerCase() === 'ben gayim') {
                            // Doğru cevap - başarı mesajı
                            const successEmbed = new MessageEmbed()
                                .setColor('#00FF00')
                                .setTitle('✅ FERDİ HUZURA KAVUŞTU!')
                                .setDescription('🏳️‍🌈 **GAY İTİRAFI KABUL EDİLDİ!**\n\n✅ Ferdi Kadıoğlu artık huzur içinde!\n👻 Ruhu sessizliğe gömüldü!\n🌈 İtiraf edilerek büyü bozuldu!')
                                .addFields(
                                    { name: '🏳️‍🌈 İtiraf Eden', value: msg.author.toString(), inline: true },
                                    { name: '⏰ İtiraf Saati', value: new Date().toLocaleTimeString('tr-TR'), inline: true },
                                    { name: '💀 Ferdi Durumu', value: 'Huzur buldu', inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Ferdi Kadıoğlu - Huzur Buldu' });

                            await msg.reply({ embeds: [successEmbed] });

                            setTimeout(async () => {
                                try {
                                    clearInterval(reminderInterval); // Interval'i temizle
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
                                    threatLevel = '🌍 TÜM KANALLAR SİLİNDİ!';
                                    threatDescription = '☢️ **DÖRDÜNCÜ HATA - FELAKET!**\n\n<@1005770697303392266> **SEN BİR DANGALAKIN!**\n\n💥 **TÜM KANALLAR SİLİNDİ!**\n🌍 Sunucu yok oluyor!\n👥 Üyeler banlanmaya başladı!\n💀 Son çare: "ben gayim" yaz!';
                                    footerText = 'Ferdi Kadıoğlu - FELAKET | Tüm Kanallar Silindi';
                                    break;
                                default:
                                    threatLevel = '💀 SUNUCU İMHA EDİLİYOR!';
                                    threatDescription = '☢️ **SON AŞAMA - MAHŞER!**\n\n<@1005770697303392266> **İNSANLIĞIN EN BÜYÜK APTALI!**\n\n💥 **SUNUCU TAMAMEN YOK EDİLİYOR!**\n👥 **TÜM ÜYELER BANLANACAK!**\n🌍 **DÜNYA SONUNA GELECEK!**\n💀 "ben gayim" yazmazsan evren yok olacak!';
                                    footerText = 'Ferdi Kadıoğlu - MAHŞER | Sunucu İmha';
                                    break;
                            }

                            const angryEmbed = new MessageEmbed()
                                .setColor('#8B0000')
                                .setTitle(threatLevel)
                                .setDescription(threatDescription)
                                .addFields(
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