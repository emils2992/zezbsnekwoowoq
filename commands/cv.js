const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');

module.exports = {
    name: 'cv',
    description: 'Envanter - sahip olduğun eşyaları ve para durumunu göster',
    aliases: ['inventory', 'envanter'],
    usage: '.cv [@kullanıcı]',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        
        // Hedef kullanıcıyı belirle
        let targetUser = message.author;
        if (args[0]) {
            const mention = message.mentions.users.first();
            if (mention) {
                targetUser = mention;
            } else {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Geçerli bir kullanıcı etiketleyin!\nÖrnek: `.cv @kullanıcı`');
                return message.reply({ embeds: [embed] });
            }
        }

        const userData = economy.getUserData(message.guild.id, targetUser.id);
        const inventory = userData.inventory || {};
        const inventoryEntries = Object.entries(inventory);

        const embed = new MessageEmbed()
            .setColor('#9932CC')
            .setTitle(`🎒 ${targetUser.username} - Envanter`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Para bilgileri
        embed.addField('💰 Para Durumu', 
            `**Nakit:** ${economy.formatAmount(userData.cash || 0)}\n` +
            `**Banka:** ${economy.formatAmount(userData.bank || 0)}\n` +
            `**Toplam:** ${economy.formatAmount((userData.cash || 0) + (userData.bank || 0))}`, 
            false
        );

        // Envanter eşyaları
        if (inventoryEntries.length === 0) {
            embed.addField('📦 Eşyalar', 'Envanterinde hiç eşya yok!', false);
        } else {
            let inventoryText = '';
            inventoryEntries.forEach(([item, data]) => {
                const count = data.count || 1;
                const emoji = data.emoji || '📦';
                inventoryText += `${emoji} **${item}** x${count}\n`;
            });
            embed.addField('📦 Eşyalar', inventoryText, false);
        }

        await message.reply({ embeds: [embed] });
    }
};