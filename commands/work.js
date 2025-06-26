const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'work',
    description: '1 dakikada bir çalışarak para kazan',
    usage: '.work',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        const result = economy.work(message.guild.id, message.author.id);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF6600')
                .setTitle('⏰ Çok Erken!')
                .setDescription(result.message)
                .addField('Bekleme Süresi', `${result.timeLeft} saniye`, true)
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('💼 Çalışma Tamamlandı!')
            .setDescription(`Başarıyla çalıştın ve **${economy.formatAmount(result.earnings)}** para kazandın!`)
            .addField('Kazanç', `💰 ${economy.formatAmount(result.earnings)}`, true)
            .addField('Yeni Bakiye', `💰 ${economy.formatAmount(result.newBalance)}`, true)
            .setFooter('1 dakika sonra tekrar çalışabilirsin!')
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'work',
            user: message.author.id,
            earnings: economy.formatAmount(result.earnings),
            newBalance: economy.formatAmount(result.newBalance)
        });
    }
};