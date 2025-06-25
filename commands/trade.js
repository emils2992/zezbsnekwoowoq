const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'trade',
    description: 'Başkanlar arası futbolcu takası',
    usage: '.trade @başkan @istenenFutbolcu @verilecekFutbolcu',
    
    async execute(client, message, args) {
        try {
            // Transfer dönemi kontrolü
            if (!permissions.isTransferPeriodOpen(message.guild.id)) {
                return message.reply('❌ Transfer dönemi kapalı! Yöneticiler `.aç` komutuyla transfer dönemini açabilir.');
            }

            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 3) {
                return message.reply('❌ Lütfen bir başkan, istenen futbolcu ve verilecek futbolcuyu etiketleyin!\nKullanım: `.trade @başkan @istenenFutbolcu @verilecekFutbolcu`');
            }

            // Mentions'ı array'e çevir ve doğru sırayla al
            const mentionsArray = Array.from(mentions.values());
            const targetPresidentUser = mentionsArray[0];
            const wantedPlayerUser = mentionsArray[1];
            const givenPlayerUser = mentionsArray[2];

            // Debug için log ekle
            console.log('Trade command - Mentions debug:');
            console.log('Total mentions:', mentions.size);
            console.log('Target president:', targetPresidentUser.username, targetPresidentUser.id);
            console.log('Wanted player:', wantedPlayerUser.username, wantedPlayerUser.id);
            console.log('Given player:', givenPlayerUser.username, givenPlayerUser.id);

            // Kendi kendini etiketleme kontrolü  
            if (targetPresidentUser.id === message.author.id || wantedPlayerUser.id === message.author.id || givenPlayerUser.id === message.author.id) {
                return message.reply('❌ Kendinizi etiketleyemezsiniz!');
            }

            // Aynı kişileri kontrol et
            if (targetPresidentUser.id === wantedPlayerUser.id || targetPresidentUser.id === givenPlayerUser.id || wantedPlayerUser.id === givenPlayerUser.id) {
                return message.reply('❌ Tüm etiketlenen kişiler farklı olmalı!');
            }

            const targetPresident = message.guild.members.cache.get(targetPresidentUser.id);
            const wantedPlayer = message.guild.members.cache.get(wantedPlayerUser.id);
            const givenPlayer = message.guild.members.cache.get(givenPlayerUser.id);

            if (!targetPresident || !wantedPlayer || !givenPlayer) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Yetki kontrolü
            if (!permissions.isPresident(targetPresident)) {
                return message.reply('❌ İlk etiketlenen kullanıcı takım başkanı olmalı!');
            }

            // Sadece futbolculara takas teklifi yapılabilir (serbest futbolcular yasak)
            if (!permissions.isPlayer(wantedPlayer)) {
                return message.reply('❌ İstenen oyuncu futbolcu rolüne sahip değil! Takas sadece futbolcular arasında yapılabilir, serbest futbolculara .offer kullanın.');
            }

            if (!permissions.isPlayer(givenPlayer)) {
                return message.reply('❌ Verilecek oyuncu futbolcu rolüne sahip değil! Takas sadece futbolcular arasında yapılabilir, serbest futbolculara .offer kullanın.');
            }

            // Modal göster
            const customId = `show_trade_modal_${targetPresidentUser.id}_${wantedPlayerUser.id}_${givenPlayerUser.id}_${message.author.id}`;
            
            const embed = new MessageEmbed()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.trade} Takas Teklifi`)
                .setDescription(`**${message.author.username}** → **${targetPresidentUser.username}**\n\n🔄 **Takas Detayları:**\n📈 **İstenen:** ${wantedPlayerUser}\n📉 **Verilecek:** ${givenPlayerUser}\n\nTakas detaylarını girmek için butona basın:`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            const button = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(customId)
                        .setLabel('📝 Form Doldur')
                        .setStyle('PRIMARY')
                        .setEmoji('📝')
                );

            await message.reply({
                embeds: [embed],
                components: [button]
            });

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
