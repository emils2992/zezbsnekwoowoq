const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'deposit',
    description: 'Nakit paranı bankaya yatır',
    usage: '.deposit miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        if (args.length < 1) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.deposit miktar`\nÖrnek: `.deposit 5k`');
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

        const result = economy.deposit(message.guild.id, message.author.id, amount);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Yatırım Başarısız')
                .setDescription(result.message);
            return message.reply({ embeds: [embed] });
        }

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('🏦 Banka Yatırımı Başarılı')
            .setDescription(`**${economy.formatAmount(amount)}** para bankaya yatırıldı!`)
            .addField('Yatırılan Miktar', `💰 ${economy.formatAmount(amount)}`, true)
            .addField('Yeni Nakit Bakiye', `💵 ${economy.formatAmount(result.newCash)}`, true)
            .addField('Yeni Banka Bakiyesi', `🏦 ${economy.formatAmount(result.newBank)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'deposit',
            user: message.author.id,
            amount: economy.formatAmount(amount),
            newBank: economy.formatAmount(result.newBank)
        });
    }
};