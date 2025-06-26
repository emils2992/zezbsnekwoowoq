const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'para'],
    description: 'Para durumunu göster',
    usage: '.balance [@kullanıcı]',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();

        // Hedef kullanıcıyı belirle
        const targetUser = message.mentions.users.first() || message.author;
        const userData = economy.getUserData(message.guild.id, targetUser.id);

        const embed = new MessageEmbed()
            .setColor('#0099FF')
            .setTitle('💰 Para Durumu')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addField('💵 Nakit', economy.formatAmount(userData.cash), true)
            .addField('🏦 Banka', economy.formatAmount(userData.bank), true)
            .addField('💎 Toplam', economy.formatAmount(userData.cash + userData.bank), true)
            .setTimestamp();

        if (targetUser.id === message.author.id) {
            embed.setDescription('Senin para durumun:');
        } else {
            embed.setDescription(`${targetUser.username} kullanıcısının para durumu:`);
        }

        await message.reply({ embeds: [embed] });
    }
};