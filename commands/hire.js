const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

const permissions = new PermissionManager();

module.exports = {
    name: 'hire',
    description: 'Başkanlar arası kiralık müzakeresi',
    usage: '.hire @başkan @oyuncu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 2) {
                return message.reply('❌ Lütfen bir başkan ve bir oyuncu etiketleyin!\nKullanım: `.hire @başkan @oyuncu`');
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
                content: `${config.emojis.hire} **Kiralık Teklifi Formu**\n\n${player.user.username} için kiralık formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_hire_modal_${targetPresidentUser.id}_${playerUser.id}_${message.author.id}`)
                            .setLabel('Kiralık Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('Hire komutu hatası:', error);
            message.reply('❌ Kiralık teklifi gönderilirken bir hata oluştu!');
        }
    },

    parseHireForm(content) {
        const data = {
            playerName: '',
            loanFee: '2.500.000₺',
            salary: '750.000₺/ay',
            contractDuration: '1 yıl',
            bonus: '500.000₺'
        };

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('oyuncu') && trimmed.includes(':')) {
                data.playerName = trimmed.split(':')[1].trim();
            } else if (trimmed.toLowerCase().includes('kiralık') && trimmed.includes(':')) {
                data.loanFee = trimmed.split(':')[1].trim();
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