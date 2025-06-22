const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'contract',
    description: 'Başkanlar arası sözleşme müzakeresi',
    usage: '.contract @başkan @oyuncu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 2) {
                return message.reply('❌ Lütfen bir başkan ve bir oyuncu etiketleyin!\nKullanım: `.contract @başkan @oyuncu`');
            }

            const targetPresidentUser = mentions.first();
            const playerUser = mentions.last();

            if (targetPresidentUser.id === playerUser.id) {
                return message.reply('❌ Başkan ve oyuncu farklı kişiler olmalı!');
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

            // Oyuncu rolü kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ İkinci etiketlenen kişi futbolcu değil!');
            }

            // Oyuncunun müsait olup olmadığını kontrol et
            if (permissions.isFreeAgent(player)) {
                return message.reply('❌ Bu oyuncu serbest! Serbest oyuncular için `.offer` komutunu kullanın.');
            }

            // Form doldurma embed'i oluştur
            const formEmbed = new EmbedBuilder()
                .setColor(config.colors.accent)
                .setTitle(`${config.emojis.edit} Sözleşme Formu`)
                .setDescription(`**${playerUser.username}** için sözleşme detaylarını doldurun.\n\nLütfen bu mesajı yanıtlayarak sözleşme bilgilerini şu formatta yazın:`)
                .addFields(
                    {
                        name: '📝 Format',
                        value: '```\nOyuncu İsmi: Lionel Messi\nTransfer Bedeli: 50.000.000₺\nMaaş: 2.000.000₺/ay\nSözleşme Süresi: 4 yıl\nBonus: 1.000.000₺\n```',
                        inline: false
                    },
                    {
                        name: '💡 Bilgi',
                        value: 'Tüm alanları doldurmanız gerekmez. Boş bırakılan alanlar varsayılan değerlerle doldurulur.',
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
                const contractData = this.parseContractForm(content);
                
                // Sözleşme formu embed'i oluştur
                const contractEmbed = embeds.createContractForm(message.author, targetPresidentUser, playerUser, contractData);
                
                // Butonları oluştur
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`contract_accept_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}_${Buffer.from(JSON.stringify(contractData)).toString('base64')}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`contract_reject_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross)
                    );

                // Özel müzakere kanalı oluştur
                const negotiationChannel = await channels.createNegotiationChannel(
                    message.guild, 
                    message.author, 
                    targetPresidentUser,
                    'contract',
                    playerUser
                );

                if (!negotiationChannel) {
                    return responseMessage.reply('❌ Müzakere kanalı oluşturulamadı!');
                }

                // Sözleşme teklifini özel kanala gönder
                await negotiationChannel.send({
                    content: `${config.emojis.contract} **Yeni Sözleşme Teklifi**\n${targetPresidentUser}, ${message.author} sizden bir sözleşme teklifi var!\n\n**Oyuncu:** ${playerUser}`,
                    embeds: [contractEmbed],
                    components: [row]
                });

                // Başarı mesajı
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.check} Sözleşme Teklifi Gönderildi`)
                    .setDescription(`${playerUser} için sözleşme teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
                    .setTimestamp();

                await responseMessage.reply({ embeds: [successEmbed] });

            } catch (error) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`${config.emojis.cross} Zaman Aşımı`)
                    .setDescription('Sözleşme formu zaman aşımına uğradı. Lütfen tekrar deneyin.')
                    .setTimestamp();
                    
                await message.followUp({ embeds: [timeoutEmbed] });
            }

        } catch (error) {
            console.error('Contract komutu hatası:', error);
            message.reply('❌ Sözleşme teklifi gönderilirken bir hata oluştu!');
        }
    },

    parseContractForm(content) {
        const data = {
            playerName: '',
            transferFee: '2.500.000₺',
            salary: '750.000₺/ay',
            contractDuration: '3 yıl',
            bonus: '500.000₺'
        };

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('oyuncu') && trimmed.includes(':')) {
                data.playerName = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('transfer') && trimmed.includes(':')) {
                data.transferFee = trimmed.split(':')[1].trim();
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
