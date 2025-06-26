const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();

module.exports = {
    name: 'duyur',
    description: 'Manuel transfer duyurusu yap',
    usage: '.duyur',
    
    async execute(client, message, args) {
        try {
            const CooldownManager = require('../utils/cooldowns');
            const cooldowns = new CooldownManager();
            
            // Serbest futbolcu rolü kontrolü
            if (!permissions.isFreeAgent(message.member)) {
                return message.reply('❌ Bu komutu sadece serbest futbolcular kullanabilir!');
            }

            // 24 saat cooldown kontrolü
            const cooldownCheck = cooldowns.canUseCommand(message.guild.id, message.author.id, 'duyur');
            if (!cooldownCheck.canUse) {
                const remainingTime = cooldowns.formatRemainingTime(cooldownCheck.remainingTime);
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('⏰ Komut Bekleme Süresi')
                    .setDescription(`Bu komutu tekrar kullanabilmek için **${remainingTime}** beklemelisin!`)
                    .addField('Son Kullanım', 'Bu komutu 24 saatte bir kullanabilirsin', false)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Set cooldown for this command
            cooldowns.setCooldown(message.guild.id, message.author.id, 'duyur');

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.announcement || '📢'} **Manuel Transfer Duyurusu**\n\nDuyuru formunu doldurmak için aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_announcement_modal_${message.author.id}`)
                            .setLabel('Duyuru Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji('📢')
                    )
                ]
            });

        } catch (error) {
            console.error('Duyur komutu hatası:', error);
            message.reply('❌ Duyuru oluşturulurken bir hata oluştu!');
        }
    }
};