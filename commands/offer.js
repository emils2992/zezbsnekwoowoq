const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'offer',
    description: 'Serbest futbolcuya teklif gönder',
    usage: '.offer @futbolcu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Futbolcu belirtildi mi kontrol et
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.offer @futbolcu`');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Futbolcu rolü kontrolü
            if (!permissions.isPlayer(targetMember)) {
                return message.reply('❌ Etiketlenen kişi futbolcu değil!');
            }

            // Serbest futbolcu kontrolü
            if (!permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu futbolcu serbest değil! Sadece serbest futbolculara teklif gönderilebilir.');
            }

            // Form doldurma embed'i oluştur
            const formEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.edit} Teklif Formu`)
                .setDescription(`**${targetUser.username}** için teklif detaylarını doldurun.\n\nLütfen bu mesajı yanıtlayarak teklif bilgilerini şu formatta yazın:`)
                .addFields(
                    {
                        name: '📝 Format',
                        value: '```\nOyuncu İsmi: Cristiano Ronaldo\nMaaş: 750.000₺/ay\nİmza Primi: 2.000.000₺\nSözleşme Süresi: 3 yıl\nBonus: 500.000₺\n```',
                        inline: false
                    },
                    {
                        name: '💡 Bilgi',
                        value: 'Tüm alanları doldurmanız gerekmez. Boş bırakılan alanlar varsayılan değerlerle doldurulur.',
                        inline: false
                    }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [formEmbed] });

            // Mesaj filtreleme
            const filter = (m) => m.author.id === message.author.id && m.channel.id === message.channel.id;
            
            try {
                const collected = await message.channel.awaitMessages({ 
                    filter, 
                    max: 1, 
                    time: 300000, // 5 dakika
                    errors: ['time'] 
                });
                
                const responseMessage = collected.first();
                const content = responseMessage.content.trim();
                
                // Form verilerini parse et
                const offerData = this.parseOfferForm(content);
                
                // Teklif formu embed'i oluştur
                const offerEmbed = embeds.createOfferForm(message.author, targetUser, offerData);
                
                // Butonları oluştur
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`offer_accept_${targetUser.id}_${message.author.id}_${Buffer.from(JSON.stringify(offerData)).toString('base64')}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`offer_reject_${targetUser.id}_${message.author.id}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross)
                    );

                // Özel müzakere kanalı oluştur
                const negotiationChannel = await channels.createNegotiationChannel(
                    message.guild, 
                    message.author, 
                    targetUser,
                    'offer'
                );

                if (!negotiationChannel) {
                    return responseMessage.reply('❌ Müzakere kanalı oluşturulamadı!');
                }

                // Teklifi özel kanala gönder
                await negotiationChannel.send({
                    content: `${config.emojis.football} **Yeni Transfer Teklifi**\n${targetUser}, ${message.author} sizden bir teklif var!`,
                    embeds: [offerEmbed],
                    components: [row]
                });

                // Başarı mesajı
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.check} Teklif Gönderildi`)
                    .setDescription(`${targetUser} için teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
                    .setTimestamp();

                await responseMessage.reply({ embeds: [successEmbed] });

            } catch (error) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.cross} Zaman Aşımı`)
                    .setDescription('Teklif formu zaman aşımına uğradı. Lütfen tekrar deneyin.')
                    .setTimestamp();
                    
                await message.followUp({ embeds: [timeoutEmbed] });
            }

        } catch (error) {
            console.error('Offer komutu hatası:', error);
            message.reply('❌ Teklif gönderilirken bir hata oluştu!');
        }
    },

    parseOfferForm(content) {
        const data = {
            playerName: '',
            salary: '500.000₺/ay',
            signingBonus: '1.000.000₺',
            contractDuration: '2 yıl',
            bonus: '250.000₺'
        };

        // Form verilerini parse et
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('oyuncu') && trimmed.includes(':')) {
                data.playerName = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('maaş') && trimmed.includes(':')) {
                data.salary = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('imza') && trimmed.includes(':')) {
                data.signingBonus = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('sözleşme') && trimmed.includes(':')) {
                data.contractDuration = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('bonus') && trimmed.includes(':')) {
                data.bonus = trimmed.split(':')[1].trim();
            }
        }

        return data;
    }
};
