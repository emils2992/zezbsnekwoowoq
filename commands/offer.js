const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
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

            // Serbest futbolcu kontrolü - serbest futbolcu rolü varsa yeterli
            if (!permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu kişi serbest futbolcu değil! Sadece serbest futbolculara teklif gönderilebilir.');
            }

            // Müzakere kanalı oluştur
            const channel = await channels.createNegotiationChannel(message.guild, message.author, targetUser, 'offer');
            if (!channel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Teklif embed'i oluştur
            const offerEmbed = embeds.createOfferForm(message.author, targetUser);
            
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`offer_accept_${targetUser.id}_${message.author.id}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`offer_reject_${targetUser.id}_${message.author.id}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`offer_edit_${targetUser.id}_${message.author.id}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await channel.send({
                embeds: [offerEmbed],
                components: [buttons]
            });

            await message.reply(`✅ Teklif müzakeresi ${channel} kanalında başlatıldı!`);

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
