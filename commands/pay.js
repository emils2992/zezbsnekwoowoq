const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'pay',
    description: 'Başka bir kullanıcıya para gönder',
    usage: '.pay @kullanıcı miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        // Kullanıcı ve miktar kontrolü
        if (args.length < 2) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.pay @kullanıcı miktar`\nÖrnek: `.pay @john 5k`');
            return message.reply({ embeds: [embed] });
        }

        // Hedef kullanıcıyı bul
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir kullanıcı etiketleyin!');
            return message.reply({ embeds: [embed] });
        }

        // Kendine para göndermeyi engelle
        if (targetUser.id === message.author.id) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kendinize para gönderemezsiniz!');
            return message.reply({ embeds: [embed] });
        }

        // Miktarı parse et
        const amount = economy.parseAmount(args[1]);
        if (!amount || amount <= 0) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir miktar girin!\nÖrnekler: `5k`, `5e3`, `5000`');
            return message.reply({ embeds: [embed] });
        }

        // Para transferini gerçekleştir
        const result = economy.transferMoney(message.guild.id, message.author.id, targetUser.id, amount);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Transfer Başarısız')
                .setDescription(result.message);
            return message.reply({ embeds: [embed] });
        }

        // Başarılı transfer mesajı
        const senderData = economy.getUserData(message.guild.id, message.author.id);
        const receiverData = economy.getUserData(message.guild.id, targetUser.id);

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('✅ Para Transferi Başarılı')
            .setDescription(`**${economy.formatAmount(amount)}** para ${targetUser} kullanıcısına gönderildi!`)
            .addField('Gönderen Yeni Bakiye', `💰 ${economy.formatAmount(senderData.cash)}`, true)
            .addField('Alan Yeni Bakiye', `💰 ${economy.formatAmount(receiverData.cash)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'pay',
            fromUser: message.author.id,
            toUser: targetUser.id,
            amount: economy.formatAmount(amount)
        });
    }
};