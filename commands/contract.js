const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
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

            // Müzakere kanalı oluştur
            const channel = await channels.createNegotiationChannel(message.guild, message.author, targetPresidentUser, 'contract', playerUser);
            if (!channel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Sözleşme embed'i oluştur
            const contractEmbed = embeds.createContractForm(message.author, targetPresidentUser, playerUser);
            
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`contract_accept_${playerUser.id}_${message.author.id}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`contract_reject_${playerUser.id}_${message.author.id}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`contract_edit_${playerUser.id}_${message.author.id}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await channel.send({
                embeds: [contractEmbed],
                components: [buttons]
            });

            await message.reply(`✅ Sözleşme müzakeresi ${channel} kanalında başlatıldı!`);

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
