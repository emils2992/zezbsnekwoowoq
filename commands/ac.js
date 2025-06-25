const { MessageEmbed } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');

const permissions = new PermissionManager();

module.exports = {
    name: 'ac',
    description: 'Transfer dönemini açar',
    usage: '.ac',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece yöneticiler kullanabilir
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece yöneticiler kullanabilir!');
            }

            // Transfer dönemi durumunu kontrol et
            const isOpen = permissions.isTransferPeriodOpen(message.guild.id);
            
            if (isOpen) {
                return message.reply('⚠️ Transfer dönemi zaten açık!');
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
            console.error('Ac komutu hatası:', error);
            message.reply('❌ Transfer dönemi açılırken bir hata oluştu!');
        }
    }
};