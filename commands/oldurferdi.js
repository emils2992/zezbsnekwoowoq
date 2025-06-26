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

            // İlk mesaj - Ferdi öldürüldü (Bu mesaj güncellenecek)
            const killEmbed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('💀 FERDİ KADIOĞLU ÖLDÜRÜLDÜ!')
                .setDescription('⚰️ Ferdi Kadıoğlu eliminasyon işlemi tamamlandı!')
                .addFields(
                    { name: '💀 Katil', value: message.author.toString(), inline: true },
                    { name: '⏰ Ölüm Saati', value: new Date().toLocaleTimeString('tr-TR'), inline: true },
                    { name: '📡 Event', value: '1/3', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Ferdi Kadıoğlu Event Sistemi' });

            const eventMessage = await message.reply({ embeds: [killEmbed] });

            // 3 Event sistemi (8 saniye aralıklarla tek mesajı güncelle)
            const events = [
                {
                    title: '👽 UZAYLILAR DÜNYAYI ELE GEÇİRDİ!',
                    description: '🛸 **FERDİ KADIOĞLU ÖLDÜRÜLDÜ, UZAYLILAR DÜNYAYI ELE GEÇİRDİ!**\n\n👽 Ferdi\'nin ölümünden sonra uzaylılar saldırıya geçti!\n🌍 Dünya artık uzaylıların kontrolünde!\n⚡ İnsanlık yok oluyor!',
                    color: '#00FF00',
                    event: '2/3'
                },
                {
                    title: '💥 DISCORD SUNUCULARI PATLATILIYOR!',
                    description: '🔥 **DISCORD SUNUCULARI PATLATILIYOR!**\n\n💻 Tüm Discord sunucuları çöküyor!\n💥 Sistem aşırı yüklendi!\n🌐 İnternet altyapısı çöküyor!',
                    color: '#FF4500',
                    event: '3/3'
                },
                {
                    title: '⚰️ FERDİNİN MEZARINDAN GELEN SON MESAJ!',
                    description: '👻 **FERDİNİN MEZARINDAN GELEN SON MESAJ:**\n\n💀 **"PİPİM AĞRIYOR YARDIM EDİN AMK!"**\n\n⚰️ Bu Ferdi\'nin son sözleri...\n👻 Artık ebedi huzura kavuştu (pipisi hariç)',
                    color: '#8B008B',
                    event: 'SON'
                }
            ];

            // Her 8 saniyede bir aynı mesajı güncelle
            for (let i = 0; i < events.length; i++) {
                setTimeout(async () => {
                    try {
                        const eventEmbed = new MessageEmbed()
                            .setColor(events[i].color)
                            .setTitle(events[i].title)
                            .setDescription(events[i].description)
                            .addFields(
                                { name: '💀 Katil', value: message.author.toString(), inline: true },
                                { name: '⏰ Event Zamanı', value: new Date().toLocaleTimeString('tr-TR'), inline: true },
                                { name: '📡 Event', value: events[i].event, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Ferdi Kadıoğlu Event Sistemi - ${events[i].event}` });

                        await eventMessage.edit({ embeds: [eventEmbed] });
                    } catch (error) {
                        console.error('Event mesajı güncellenirken hata:', error);
                    }
                }, (i + 1) * 8000);
            }

            // Son eventten sonra özel kanal oluştur (32 saniye sonra - 4*8=32)
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

                    // Matrix hack mesajı - Ferdi'yi etiketle
                    setTimeout(async () => {
                        const matrixEmbed = new MessageEmbed()
                            .setColor('#00FF00')
                            .setTitle('🔴 SYSTEM BREACH DETECTED')
                            .setDescription(`⚠️ **MATRIX HACKED!**\n\n💀 <@1005770697303392266> Ferdi Kadıoğlu\'nun ruhu sisteme sızdı!\n🖥️ Matrix kodları bozuldu!\n👹 **ARTIK ŞEYTANDİR!**\n\n💀 Ferdi cehennemden güç alıyor!\n🔥 Ateş nefes veriyor!\n👺 Korkunç bir canavar oldu!\n\n⚡ Sistem kontrolden çıktı!\n🌐 Sanal gerçeklik çöküyor!`)
                            .addFields(
                                { name: '🚨 ALERT LEVEL', value: 'MAXIMUM', inline: true },
                                { name: '💀 TARGET', value: '<@1005770697303392266>', inline: true },
                                { name: '🔥 THREAT', value: 'DEVIL FERDI', inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Matrix Security System - COMPROMISED' });

                        await specialChannel.send({ content: '<@1005770697303392266>', embeds: [matrixEmbed] });
                    }, 2000);

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
                                    threatDescription = '☢️ **DÖRDÜNCÜ HATA - FELAKET!**\n\n<@1005770697303392266> **SEN BİR DANGALAKSIN!**\n\n💥 **TÜM KANALLAR SİLİNDİ!**\n🌍 Sunucu yok oluyor!\n👥 Üyeler banlanmaya başladı!\n💀 Son çare: "ben gayim" yaz!';
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