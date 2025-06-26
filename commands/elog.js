const { MessageEmbed } = require('discord.js');
const EconomyLogger = require('../utils/economyLogger');
const PermissionManager = require('../utils/permissions');

module.exports = {
    name: 'elog',
    description: 'Ekonomi log kanalını ayarla',
    usage: '.elog #kanal',
    
    async execute(client, message, args) {
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

        if (args.length < 1) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.elog #kanal`\nÖrnek: `.elog #ekonomi-log`');
            return message.reply({ embeds: [embed] });
        }

        // Kanal kontrolü
        const channel = message.mentions.channels.first();
        if (!channel) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir kanal etiketleyin!');
            return message.reply({ embeds: [embed] });
        }

        // Log kanalını ayarla
        logger.setLogChannel(message.guild.id, channel.id);

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('✅ Ekonomi Log Kanalı Ayarlandı')
            .setDescription(`Ekonomi işlemleri artık ${channel} kanalında loglanacak!`)
            .addField('Kanal', channel.toString(), true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Test log mesajı gönder
        await logger.logTransaction(client, message.guild.id, {
            type: 'system',
            message: 'Ekonomi log sistemi aktif edildi!'
        });
    }
};