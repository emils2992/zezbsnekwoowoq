const { MessageEmbed } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');

module.exports = {
    name: 'aç',
    description: 'Transfer dönemini açar',
    usage: '.aç',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece yöneticiler kullanabilir
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece yöneticiler kullanabilir!');
            }

            // Transfer dönemini aç
            permissions.setTransferPeriod(message.guild.id, true);

            const embed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('🟢 Transfer Dönemi Açıldı')
                .setDescription('Transfer dönemi başarıyla açıldı!')
                .addFields(
                    { name: '📋 Etkilenen Komutlar', value: '✅ `.hire` - Kiralık transferler\n✅ `.contract` - Sözleşme transferleri\n✅ `.trade` - Oyuncu takasları', inline: false },
                    { name: '👑 Yönetici', value: `${message.author}`, inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleDateString('tr-TR'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Aç komutu hatası:', error);
            message.reply('❌ Transfer dönemi açılırken bir hata oluştu!');
        }
    }
};