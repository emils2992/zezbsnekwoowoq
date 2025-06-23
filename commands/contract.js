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

            // Mentions'ı array'e çevir ve doğru sırayla al
            const mentionsArray = Array.from(mentions.values());
            const targetPresidentUser = mentionsArray[0];
            const playerUser = mentionsArray[1];



            if (targetPresidentUser.id === playerUser.id) {
                return message.reply('❌ Başkan ve oyuncu farklı kişiler olmalı!');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetPresidentUser.id === message.author.id || playerUser.id === message.author.id) {
                return message.reply('❌ Kendinizi etiketleyemezsiniz!');
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

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.contract} **Sözleşme Teklifi Formu**\n\n${playerUser.username} için sözleşme formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_contract_modal_${playerUser.id}_${message.author.id}`)
                            .setLabel('Sözleşme Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

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
