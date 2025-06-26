const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();

module.exports = {
    name: 'yt',
    description: 'Son transferleri listeler (Sadece yetkililer)',
    usage: '.yt',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece transfer yetkilileri kullanabilir
            if (!permissions.isTransferAuthority(message.member)) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
            }

            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            if (!fs.existsSync(transfersPath)) {
                return message.reply('❌ Henüz hiç transfer kaydı yok!');
            }

            const transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            const guildTransfers = transfersData[message.guild.id] || [];

            if (guildTransfers.length === 0) {
                return message.reply('❌ Bu sunucuda henüz hiç transfer kaydı yok!');
            }

            // Son 10 transferi al (en yeniler önce)
            const recentTransfers = guildTransfers.slice(-10).reverse();

            const embed = new MessageEmbed()
                .setColor(config.colors.warning)
                .setTitle('🔍 Son Transferler - Yetkili Görünümü')
                .setDescription(`Son ${recentTransfers.length} transfer (En yeniler önce)`)
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi - Yetkili' });

            recentTransfers.forEach((transfer, index) => {
                let transferText = `**Oyuncu:** ${transfer.playerMention || transfer.player}`;
                
                if (transfer.type === 'offer') {
                    // Serbest transfer - eski kulüp gösterme
                    transferText += `\n📥 **Yeni Kulüp:** ${transfer.toTeam}`;
                } else if (transfer.type === 'trade') {
                    // Takas - başkanları etiketleyerek göster
                    transferText += `\n🔄 **Takas:** ${transfer.presidentMention || transfer.fromTeam} ↔ ${transfer.targetPresidentMention || transfer.toTeam}`;
                } else {
                    // Contract, hire vb. - sadece kulüp bilgileri
                    if (transfer.fromTeam) transferText += `\n📤 **Eski Kulüp:** ${transfer.fromTeam}`;
                    if (transfer.toTeam) transferText += `\n📥 **Yeni Kulüp:** ${transfer.toTeam}`;
                }
                
                transferText += `\n📅 **Tarih:** ${transfer.date}`;
                transferText += `\n📝 **Tür:** ${transfer.type.toUpperCase()}`;
                
                const fieldName = `${index + 1}. ${config.emojis.football || '⚽'} Transfer`;
                embed.addFields({ name: fieldName, value: transferText, inline: false });
            });

            // Toplam transfer sayısı bilgisi
            if (guildTransfers.length > 10) {
                embed.addFields({ 
                    name: 'ℹ️ Bilgi', 
                    value: `Toplam ${guildTransfers.length} transfer kaydı var. Tümünü görmek için \`.tf\` komutunu kullanın.`, 
                    inline: false 
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('YT komutu hatası:', error);
            message.reply('❌ Transfer listesi gösterilirken bir hata oluştu!');
        }
    }
};