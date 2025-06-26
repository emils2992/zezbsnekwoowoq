const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const TransferTracker = require('../utils/transferTracker');
const transferTracker = new TransferTracker();

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

            // Kendi kendini etiketleme kontrolü
            if (targetUser.id === message.author.id) {
                return message.reply('❌ Kendinize teklif yapamazsınız!');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Role debugging
            console.log(`Offer command - checking roles for ${targetMember.displayName}`);
            console.log(`Is free agent: ${permissions.isFreeAgent(targetMember)}`);
            console.log(`Is player: ${permissions.isPlayer(targetMember)}`);
            console.log(`User roles:`, targetMember.roles.cache.map(r => r.name));

            // Serbest futbolcu kontrolü - serbest futbolcu rolü olmalı
            if (!permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Bu kişi serbest futbolcu değil! Sadece serbest futbolculara teklif gönderilebilir.');
            }

            // Futbolcu rolü kontrolü - futbolcu rolü varsa teklif gönderilemez (takımda olan oyuncular)
            if (permissions.isPlayer(targetMember)) {
                return message.reply('❌ Bu kişi zaten bir takımda! Futbolculara teklif gönderilemez, sözleşme teklifi kullanın.');
            }

            // Transfer kontrolü - oyuncu bu dönem transfer edilmiş mi?
            const transferStatus = transferTracker.isPlayerTransferred(message.guild.id, targetUser.id);
            if (transferStatus.isTransferred) {
                return message.reply('❌ Bu oyuncu bu dönem zaten transfer yapıldı! Transfer dönemini yöneticiler sıfırlayabilir.');
            }

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.football} **Transfer Teklifi Formu**\n\n${targetMember.displayName} için teklif formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_offer_modal_${targetUser.id}_${message.author.id}`)
                            .setLabel('Teklif Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

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
