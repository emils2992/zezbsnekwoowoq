const { MessageEmbed, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.transfer} **Takas Teklifi Formu**\n\n${playerUser.username} için takas formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`show_trade_modal_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                            .setLabel('Takas Formu Aç')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(config.emojis.edit)
                    )
                ]
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
