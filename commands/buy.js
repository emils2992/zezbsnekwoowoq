const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'buy',
    description: 'Mağazadan ürün satın al',
    usage: '.buy ürün_adı',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        if (args.length < 1) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.buy ürün_adı`\nÖrnek: `.buy Bugatti`');
            return message.reply({ embeds: [embed] });
        }

        const itemName = args.join(' '); // Boşluklu ürün isimlerini destekle

        const result = economy.buyShopItem(message.guild.id, message.author.id, itemName);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Satın Alma Başarısız')
                .setDescription(result.message);
            return message.reply({ embeds: [embed] });
        }

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('🛍️ Satın Alma Başarılı!')
            .setDescription(`**${result.item}** başarıyla satın alındı!`)
            .addField('Ürün', result.item, true)
            .addField('Ödenen Tutar', `💰 ${economy.formatAmount(result.price)}`, true)
            .addField('Kalan Bakiye', `💰 ${economy.formatAmount(result.newBalance)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'shop_buy',
            buyer: message.author.id,
            item: result.item,
            price: economy.formatAmount(result.price)
        });
    }
};