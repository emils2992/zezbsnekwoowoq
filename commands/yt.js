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
                    if (transfer.salary && transfer.salary !== 'Belirtilmemiş') {
                        transferText += `\n💰 **Maaş:** ${transfer.salary}`;
                    }
                    if (transfer.duration && transfer.duration !== 'Belirtilmemiş') {
                        transferText += `\n📅 **Sözleşme:** ${transfer.duration}`;
                    }
                } else if (transfer.type === 'trade') {
                    // Takas - başkanların takımları formatı
                    transferText += `\n🔄 **Takas:** ${transfer.fromTeam} ↔ ${transfer.toTeam}`;
                    if (transfer.salary && transfer.salary !== 'Belirtilmemiş') {
                        transferText += `\n💰 **Maaşlar:** ${transfer.salary}`;
                    }
                    if (transfer.amount && transfer.amount !== 'Belirtilmemiş') {
                        transferText += `\n💵 **Ek Miktar:** ${transfer.amount}`;
                    }
                } else {
                    // Contract, hire vb. - tam detay
                    if (transfer.fromTeam) transferText += `\n📤 **Eski Kulüp:** ${transfer.fromTeam}`;
                    if (transfer.toTeam) transferText += `\n📥 **Yeni Kulüp:** ${transfer.toTeam}`;
                    if (transfer.amount && transfer.amount !== 'Belirtilmemiş') {
                        transferText += `\n💰 **Ücret:** ${transfer.amount}`;
                    }
                    if (transfer.salary && transfer.salary !== 'Belirtilmemiş') {
                        transferText += `\n💵 **Maaş:** ${transfer.salary}`;
                    }
                    if (transfer.duration && transfer.duration !== 'Belirtilmemiş') {
                        transferText += `\n📋 **Sözleşme:** ${transfer.duration}`;
                    }
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