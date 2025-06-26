const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const EconomyManager = require('../utils/economy');

module.exports = {
    name: 'lb',
    description: 'Sunucudaki zenginlik sıralaması',
    usage: '.lb [sayfa]',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        
        const page = parseInt(args[0]) || 1;
        const leaderboard = economy.getLeaderboard(message.guild.id, page, 10);

        if (leaderboard.users.length === 0) {
            const embed = new MessageEmbed()
                .setColor('#FF6600')
                .setTitle('💰 Zenginlik Sıralaması')
                .setDescription('Henüz hiç ekonomik aktivite yok!')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const embed = new MessageEmbed()
            .setColor('#FFD700')
            .setTitle('💰 Zenginlik Sıralaması')
            .setDescription(`Sayfa ${leaderboard.currentPage}/${leaderboard.totalPages}`)
            .setTimestamp();

        let description = '';
        leaderboard.users.forEach((user, index) => {
            const rank = (leaderboard.currentPage - 1) * 10 + index + 1;
            let medal = '';
            
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = `${rank}.`;

            description += `${medal} <@${user.userId}>\n`;
            description += `💵 Nakit: ${economy.formatAmount(user.cash)} | `;
            description += `🏦 Banka: ${economy.formatAmount(user.bank)}\n`;
            description += `💰 Toplam: **${economy.formatAmount(user.total)}**\n\n`;
        });

        embed.setDescription(description);

        // Sayfa navigasyon butonları
        const components = [];
        if (leaderboard.totalPages > 1) {
            const row = new MessageActionRow();
            
            if (leaderboard.currentPage > 1) {
                row.addComponents(
                    new MessageButton()
                        .setCustomId(`lb_prev_${leaderboard.currentPage - 1}`)
                        .setLabel('◀ Önceki')
                        .setStyle('SECONDARY')
                );
            }

            if (leaderboard.currentPage < leaderboard.totalPages) {
                row.addComponents(
                    new MessageButton()
                        .setCustomId(`lb_next_${leaderboard.currentPage + 1}`)
                        .setLabel('Sonraki ▶')
                        .setStyle('SECONDARY')
                );
            }

            if (row.components.length > 0) {
                components.push(row);
            }
        }

        const messageOptions = { embeds: [embed] };
        if (components.length > 0) {
            messageOptions.components = components;
        }

        await message.reply(messageOptions);
    }
};