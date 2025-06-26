const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');
const PermissionManager = require('../utils/permissions');

module.exports = {
    name: 'remove',
    description: 'Kullanıcıdan para çıkar (yetkililer için)',
    usage: '.remove @kullanıcı miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();
        const permissions = new PermissionManager();

        // Yetki kontrolü
        if (!permissions.isTransferAuthority(message.member)) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Yetki Hatası')
                .setDescription('Bu komutu kullanmak için transfer yetkisi gerekiyor!');
            return message.reply({ embeds: [embed] });
        }

        // Kullanıcı ve miktar kontrolü
        if (args.length < 2) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.remove @kullanıcı miktar`\nÖrnek: `.remove @john 5k`');
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

        // Miktarı parse et
        const amount = economy.parseAmount(args[1]);
        if (!amount || amount <= 0) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir miktar girin!\nÖrnekler: `5k`, `5e3`, `5000`');
            return message.reply({ embeds: [embed] });
        }

        // Parayı çıkar
        const userData = economy.adjustMoney(message.guild.id, targetUser.id, -amount, 'cash');

        const embed = new MessageEmbed()
            .setColor('#FF6600')
            .setTitle('💸 Para Çıkarıldı')
            .setDescription(`${targetUser} kullanıcısından **${economy.formatAmount(amount)}** para çıkarıldı!`)
            .addField('Yeni Bakiye', `💰 ${economy.formatAmount(userData.cash)}`, true)
            .addField('Banka Bakiyesi', `🏦 ${economy.formatAmount(userData.bank)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'remove',
            admin: message.author.id,
            target: targetUser.id,
            amount: economy.formatAmount(amount)
        });
    }
};