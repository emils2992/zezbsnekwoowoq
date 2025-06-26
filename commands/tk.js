const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'tk',
    description: 'Bankadan para çek',
    usage: '.tk miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        if (args.length < 1) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.tk miktar`\nÖrnek: `.tk 5k`');
            return message.reply({ embeds: [embed] });
        }

        // Miktarı parse et
        const amount = economy.parseAmount(args[0]);
        if (!amount || amount <= 0) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir miktar girin!\nÖrnekler: `5k`, `5e3`, `5000`');
            return message.reply({ embeds: [embed] });
        }

        const result = economy.withdraw(message.guild.id, message.author.id, amount);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Çekim Başarısız')
                .setDescription(result.message);
            return message.reply({ embeds: [embed] });
        }

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('💵 Banka Çekimi Başarılı')
            .setDescription(`**${economy.formatAmount(amount)}** para bankadan çekildi!`)
            .addField('Çekilen Miktar', `💰 ${economy.formatAmount(amount)}`, true)
            .addField('Yeni Nakit Bakiye', `💵 ${economy.formatAmount(result.newCash)}`, true)
            .addField('Yeni Banka Bakiyesi', `🏦 ${economy.formatAmount(result.newBank)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'withdraw',
            user: message.author.id,
            amount: economy.formatAmount(amount),
            newCash: economy.formatAmount(result.newCash)
        });
    }
};