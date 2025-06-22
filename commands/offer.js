const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

            // Modal formu oluştur
            const modal = new ModalBuilder()
                .setCustomId(`offer_form_${targetUser.id}_${message.author.id}`)
                .setTitle('Transfer Teklifi Formu');

            // Form alanları
            const playerNameInput = new TextInputBuilder()
                .setCustomId('player_name')
                .setLabel('Oyuncu İsmi')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: Cristiano Ronaldo')
                .setRequired(false);

            const salaryInput = new TextInputBuilder()
                .setCustomId('salary')
                .setLabel('Maaş')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 750.000₺/ay')
                .setRequired(false);

            const signingBonusInput = new TextInputBuilder()
                .setCustomId('signing_bonus')
                .setLabel('İmza Primi')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 2.000.000₺')
                .setRequired(false);

            const contractDurationInput = new TextInputBuilder()
                .setCustomId('contract_duration')
                .setLabel('Sözleşme Süresi')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 3 yıl')
                .setRequired(false);

            const bonusInput = new TextInputBuilder()
                .setCustomId('bonus')
                .setLabel('Bonuslar')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 500.000₺')
                .setRequired(false);

            // Action Row'lar oluştur
            const row1 = new ActionRowBuilder().addComponents(playerNameInput);
            const row2 = new ActionRowBuilder().addComponents(salaryInput);
            const row3 = new ActionRowBuilder().addComponents(signingBonusInput);
            const row4 = new ActionRowBuilder().addComponents(contractDurationInput);
            const row5 = new ActionRowBuilder().addComponents(bonusInput);

            modal.addComponents(row1, row2, row3, row4, row5);

            // Modal'ı göster
            await message.reply(`${config.emojis.edit} **${targetUser.username}** için teklif formu açılıyor...`);
            
            // Modal'ı DM ile gönder (eğer mümkünse)
            try {
                await message.author.send({
                    content: `${config.emojis.football} **Transfer Teklifi Formu**\n\n${targetUser.username} için teklif formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`show_offer_modal_${targetUser.id}_${message.author.id}`)
                                .setLabel('Formu Aç')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(config.emojis.edit)
                        )
                    ]
                });
                
                await message.followUp('✅ Teklif formu DM olarak gönderildi! Lütfen özel mesajlarınızı kontrol edin.');
            } catch (error) {
                // DM gönderilemezse kanal üzerinden buton göster
                await message.followUp({
                    content: `${config.emojis.football} **Transfer Teklifi Formu**\n\n${targetUser.username} için teklif formunu doldurmak üzere aşağıdaki butona tıklayın.`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`show_offer_modal_${targetUser.id}_${message.author.id}`)
                                .setLabel('Formu Aç')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(config.emojis.edit)
                        )
                    ]
                });
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
