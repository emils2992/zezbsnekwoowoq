const { MessageEmbed } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');

module.exports = {
    name: 'kapa',
    description: 'Transfer dönemini kapatır',
    usage: '.kapa',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece yöneticiler kullanabilir
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece yöneticiler kullanabilir!');
            }

            // Transfer dönemi durumunu kontrol et
            const isOpen = permissions.isTransferPeriodOpen(message.guild.id);
            
            if (!isOpen) {
                return message.reply('⚠️ Transfer dönemi zaten kapalı!');
            }

            // Transfer dönemini kapat
            permissions.setTransferPeriod(message.guild.id, false);

            const embed = new MessageEmbed()
                .setColor(config.colors.error)
                .setTitle('🔴 Transfer Dönemi Kapatıldı')
                .setDescription('Transfer dönemi başarıyla kapatıldı!')
                .addFields(
                    { name: '📋 Etkilenen Komutlar', value: '❌ `.hire` - Kiralık transferler\n❌ `.contract` - Sözleşme transferleri\n❌ `.trade` - Oyuncu takasları', inline: false },
                    { name: '⚠️ Not', value: 'Devam eden transferler etkilenmez, sadece yeni transferler engellenecektir.', inline: false },
                    { name: '👑 Yönetici', value: `${message.author}`, inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleDateString('tr-TR'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Kapa komutu hatası:', error);
            message.reply('❌ Transfer dönemi kapatılırken bir hata oluştu!');
        }
    }
};