const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'trade',
    description: 'Başkanlar arası futbolcu takası',
    usage: '.trade @başkan @futbolcu [ek_miktar]',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 2) {
                return message.reply('❌ Lütfen bir başkan ve bir futbolcu etiketleyin!\nKullanım: `.trade @başkan @futbolcu [ek_miktar]`');
            }

            const targetPresidentUser = mentions.first();
            const playerUser = mentions.last();

            if (targetPresidentUser.id === playerUser.id) {
                return message.reply('❌ Başkan ve futbolcu farklı kişiler olmalı!');
            }

            const targetPresident = message.guild.members.cache.get(targetPresidentUser.id);
            const player = message.guild.members.cache.get(playerUser.id);

            if (!targetPresident || !player) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Başkan rolü kontrolü
            if (!permissions.isPresident(targetPresident)) {
                return message.reply('❌ İlk etiketlenen kişi takım başkanı değil!');
            }

            // Futbolcu rolü kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ İkinci etiketlenen kişi futbolcu değil!');
            }

            // Serbest futbolcu kontrolü
            if (permissions.isFreeAgent(player)) {
                return message.reply('❌ Serbest futbolcular takas edilemez! Serbest oyuncular için `.offer` komutunu kullanın.');
            }

            // Form doldurma embed'i oluştur
            const formEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.edit} Takas Formu`)
                .setDescription(`**${playerUser.username}** için takas detaylarını doldurun.\n\nLütfen bu mesajı yanıtlayarak takas bilgilerini şu formatta yazın:`)
                .addFields(
                    {
                        name: '📝 Format',
                        value: '```\nOyuncu İsmi: Neymar Jr\nEk Miktar: 15.000.000₺\nMaaş: 1.500.000₺/ay\nSözleşme Süresi: 4 yıl\nBonus: 750.000₺\n```',
                        inline: false
                    },
                    {
                        name: '💡 Bilgi',
                        value: 'Ek miktar belirtmezseniz sadece oyuncu takası yapılır. Diğer alanlar isteğe bağlıdır.',
                        inline: false
                    }
                )
                .setThumbnail(playerUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [formEmbed] });

            // Mesaj filtreleme
            const filter = (m) => m.author.id === message.author.id && m.channel.id === message.channel.id;
            
            try {
                const collected = await message.channel.awaitMessages({ 
                    filter, 
                    max: 1, 
                    time: 300000,
                    errors: ['time'] 
                });
                
                const responseMessage = collected.first();
                const content = responseMessage.content.trim();
                
                // Form verilerini parse et
                const tradeData = this.parseTradeForm(content);
                
                // Takas formu embed'i oluştur
                const tradeEmbed = embeds.createTradeForm(message.author, targetPresidentUser, playerUser, tradeData);
                
                // Butonları oluştur
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`trade_accept_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}_${Buffer.from(JSON.stringify(tradeData)).toString('base64')}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`trade_reject_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross),
                        new ButtonBuilder()
                            .setCustomId(`trade_counter_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                            .setLabel('Sende Yap')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(config.emojis.handshake)
                    );

                // Özel müzakere kanalı oluştur
                const negotiationChannel = await channels.createNegotiationChannel(
                    message.guild, 
                    message.author, 
                    targetPresidentUser,
                    'trade',
                    playerUser
                );

                if (!negotiationChannel) {
                    return responseMessage.reply('❌ Müzakere kanalı oluşturulamadı!');
                }

                // Takas teklifini özel kanala gönder
                await negotiationChannel.send({
                    content: `${config.emojis.transfer} **Yeni Takas Teklifi**\n${targetPresidentUser}, ${message.author} sizden bir takas teklifi var!\n\n**Oyuncu:** ${playerUser}`,
                    embeds: [tradeEmbed],
                    components: [row]
                });

                // Başarı mesajı
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.check} Takas Teklifi Gönderildi`)
                    .setDescription(`${playerUser} için takas teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
                    .setTimestamp();

                await responseMessage.reply({ embeds: [successEmbed] });

            } catch (error) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.cross} Zaman Aşımı`)
                    .setDescription('Takas formu zaman aşımına uğradı. Lütfen tekrar deneyin.')
                    .setTimestamp();
                    
                await message.followUp({ embeds: [timeoutEmbed] });
            }

        } catch (error) {
            console.error('Trade komutu hatası:', error);
            message.reply('❌ Takas teklifi gönderilirken bir hata oluştu!');
        }
    },

    parseTradeForm(content) {
        const data = {
            playerName: '',
            additionalAmount: 0,
            salary: '850.000₺/ay',
            contractDuration: '4 yıl',
            bonus: '400.000₺'
        };

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('oyuncu') && trimmed.includes(':')) {
                data.playerName = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('ek') && trimmed.includes(':')) {
                const amountStr = trimmed.split(':')[1].replace(/[^\d]/g, '');
                data.additionalAmount = parseInt(amountStr) || 0;
            } else if (trimmed.toLowerCase().includes('maaş') && trimmed.includes(':')) {
                data.salary = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('sözleşme') && trimmed.includes(':')) {
                data.contractDuration = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('bonus') && trimmed.includes(':')) {
                data.bonus = trimmed.split(':')[1].trim();
            }
        }

        return data;
    }
};
