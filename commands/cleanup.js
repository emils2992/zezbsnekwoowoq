const { MessageEmbed } = require('discord.js');
const config = require('../config');
const channels = require('../utils/channels');
const PermissionManager = require('../utils/permissions');

const permissions = new PermissionManager();

module.exports = {
    name: 'cleanup',
    description: 'Eski müzakere kanallarını temizler',
    
    async execute(client, message, args) {
        // Only transfer authorities can use this command
        if (!permissions.isTransferAuthority(message.member)) {
            return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
        }

        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle('🧹 Kanal Temizleme')
            .setDescription('Eski müzakere kanalları temizleniyor...');

        const statusMessage = await message.reply({ embeds: [embed] });

        try {
            const deletedCount = await channels.cleanupOldChannels(message.guild);
            
            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Temizlik Tamamlandı')
                .setDescription(`${deletedCount} eski müzakere kanalı silindi.`)
                .setTimestamp();

            await statusMessage.edit({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Cleanup command error:', error);
            
            const errorEmbed = new MessageEmbed()
                .setColor(config.colors.error)
                .setTitle('❌ Temizlik Hatası')
                .setDescription('Kanal temizleme sırasında hata oluştu.');

            await statusMessage.edit({ embeds: [errorEmbed] });
        }
    }
};