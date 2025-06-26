const { MessageEmbed } = require('discord.js');
const config = require('../config');
const PermissionManager = require('../utils/permissions');
const TransferTracker = require('../utils/transferTracker');

const permissions = new PermissionManager();
const transferTracker = new TransferTracker();

module.exports = {
    name: 'transferstatus',
    description: 'Oyuncunun transfer durumunu kontrol et',
    usage: '.transferstatus @oyuncu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece transfer yetkilileri kullanabilir
            if (!permissions.isTransferAuthority(message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri veya yöneticiler kullanabilir!');
            }

            // Oyuncu belirtildi mi kontrol et
            if (!message.mentions.users.size) {
                return message.reply('❌ Lütfen bir oyuncu etiketleyin!\nKullanım: `.transferstatus @oyuncu`');
            }

            const targetUser = message.mentions.users.first();
            const targetMember = message.guild.members.cache.get(targetUser.id);
            
            if (!targetMember) {
                return message.reply('❌ Etiketlenen kullanıcı sunucuda bulunamadı!');
            }

            // Transfer durumunu kontrol et
            const transferStatus = transferTracker.isPlayerTransferred(message.guild.id, targetUser.id);
            
            const embed = new MessageEmbed()
                .setColor(transferStatus.isTransferred ? '#FF6B6B' : '#4ECDC4')
                .setTitle('🔍 Transfer Durumu Kontrolü')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addField('👤 Oyuncu', `${targetUser}`, true)
                .addField('🏷️ Roller', targetMember.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'Rol yok', true)
                .addField('📊 Transfer Durumu', transferStatus.isTransferred ? '❌ Transfer Yapıldı' : '✅ Transfer Edilebilir', true);

            if (transferStatus.isTransferred) {
                embed.addField('📝 Transfer Türü', transferStatus.transferType, true);
                embed.addField('📅 Transfer Tarihi', new Date(transferStatus.timestamp).toLocaleDateString('tr-TR') + ' ' + new Date(transferStatus.timestamp).toLocaleTimeString('tr-TR'), true);
                embed.addField('💡 Not', 'Oyuncu zaten transfer edilmiş. Yöneticiler `.ac` komutuyla transfer dönemini sıfırlayabilir.', false);
            } else {
                embed.addField('💡 Not', '✅ Bu oyuncu `.offer`, `.contract`, `.trade` komutlarıyla transfer edilebilir.\n🏠 `.hire` komutu (kiralık) her zaman kullanılabilir.', false);
            }

            embed.setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Transfer status komutu hatası:', error);
            message.reply('❌ Transfer durumu kontrol edilirken bir hata oluştu.');
        }
    }
};