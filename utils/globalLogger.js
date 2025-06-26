const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class GlobalLogger {
    constructor() {
        this.logDataPath = path.join(__dirname, '..', 'data', 'globalLog.json');
    }

    // Get the global log channel
    getLogChannel(client) {
        try {
            if (!fs.existsSync(this.logDataPath)) {
                return null;
            }

            const logData = JSON.parse(fs.readFileSync(this.logDataPath, 'utf8'));
            const guild = client.guilds.cache.get(logData.guildId);
            if (!guild) return null;

            const channel = guild.channels.cache.get(logData.channelId);
            if (!channel || channel.deleted) return null;

            return channel;
        } catch (error) {
            console.error('Global log channel okuma hatası:', error);
            return null;
        }
    }

    // Log a transfer announcement
    async logTransfer(client, transferType, guildName, transferData) {
        try {
            const logChannel = this.getLogChannel(client);
            if (!logChannel) return;

            const logEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`📋 ${transferType} - ${guildName}`)
                .setDescription('Yeni transfer duyurusu yapıldı!')
                .addFields(
                    { name: '🏢 Sunucu', value: guildName, inline: true },
                    { name: '📝 İşlem Türü', value: transferType, inline: true },
                    { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                );

            // Add transfer-specific fields with better formatting
            if (transferData.player) {
                logEmbed.addFields({ name: '⚽ Oyuncu', value: transferData.player, inline: true });
            }
            if (transferData.fromTeam) {
                // Clean up team names - remove Discord mentions and format properly
                const cleanFromTeam = transferData.fromTeam.replace(/<@!?\d+>/g, '').replace(/nin takımı$/g, '').trim();
                logEmbed.addFields({ name: '📤 Eski Takım', value: cleanFromTeam, inline: true });
            }
            if (transferData.toTeam) {
                // Clean up team names - remove Discord mentions and format properly
                const cleanToTeam = transferData.toTeam.replace(/<@!?\d+>/g, '').replace(/nin takımı$/g, '').trim();
                logEmbed.addFields({ name: '📥 Yeni Takım', value: cleanToTeam, inline: true });
            }
            if (transferData.amount && transferData.amount !== 'Bilinmiyor' && transferData.amount !== 'Belirtilmemiş') {
                logEmbed.addFields({ name: '💰 Transfer Ücreti', value: transferData.amount, inline: true });
            }
            if (transferData.salary && transferData.salary !== 'Bilinmiyor' && transferData.salary !== 'Belirtilmemiş') {
                logEmbed.addFields({ name: '💵 Maaş', value: transferData.salary, inline: true });
            }
            if (transferData.duration && transferData.duration !== 'Bilinmiyor' && transferData.duration !== 'Belirtilmemiş') {
                logEmbed.addFields({ name: '📅 Sözleşme Süresi', value: transferData.duration, inline: true });
            }
            if (transferData.reason) {
                logEmbed.addFields({ name: '📝 Sebep', value: transferData.reason, inline: false });
            }

            logEmbed.setTimestamp();
            logEmbed.setFooter({ text: `Global Log - ${guildName}` });

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Global log gönderme hatası:', error);
        }
    }

    // Log a free agent announcement
    async logFreeAgent(client, guildName, playerData) {
        try {
            const logChannel = this.getLogChannel(client);
            if (!logChannel) return;

            const logEmbed = new MessageEmbed()
                .setColor('#FFA500')
                .setTitle(`🆓 Serbest Oyuncu - ${guildName}`)
                .setDescription('Yeni serbest oyuncu duyurusu!')
                .addFields(
                    { name: '🏢 Sunucu', value: guildName, inline: true },
                    { name: '⚽ Oyuncu', value: playerData.player, inline: true },
                    { name: '📤 Eski Kulüp', value: playerData.oldClub || 'Belirtilmemiş', inline: true },
                    { name: '📝 Fesih Nedeni', value: playerData.reason || 'Belirtilmemiş', inline: true },
                    { name: '💰 Tazminat', value: playerData.compensation || 'Yok', inline: true },
                    { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Global Log - ${guildName}` });

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Global log gönderme hatası:', error);
        }
    }

    // Log a player announcement
    async logPlayerAnnouncement(client, guildName, announcementData) {
        try {
            const logChannel = this.getLogChannel(client);
            if (!logChannel) return;

            const logEmbed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle(`📢 Oyuncu Duyurusu - ${guildName}`)
                .setDescription('Yeni oyuncu duyurusu yapıldı!')
                .addFields(
                    { name: '🏢 Sunucu', value: guildName, inline: true },
                    { name: '⚽ Oyuncu', value: announcementData.player, inline: true },
                    { name: '📊 Stat Kasma', value: announcementData.stats || 'Belirtilmemiş', inline: true },
                    { name: '💰 İstenen Maaş', value: announcementData.salary || 'Belirtilmemiş', inline: true },
                    { name: '📅 Sözleşme', value: announcementData.duration || 'Belirtilmemiş', inline: true },
                    { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Global Log - ${guildName}` });

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Global log gönderme hatası:', error);
        }
    }

    // Log a transfer list announcement
    async logTransferList(client, guildName, listData) {
        try {
            const logChannel = this.getLogChannel(client);
            if (!logChannel) return;

            const logEmbed = new MessageEmbed()
                .setColor('#FF1493')
                .setTitle(`📋 Transfer Listesi - ${guildName}`)
                .setDescription('Yeni transfer listesi duyurusu!')
                .addFields(
                    { name: '🏢 Sunucu', value: guildName, inline: true },
                    { name: '⚽ Oyuncu', value: listData.player, inline: true },
                    { name: '👑 Başkan/Takım', value: listData.president, inline: true },
                    { name: '🏟️ Mevcut Takım', value: listData.currentTeam || 'Belirtilmemiş', inline: true },
                    { name: '💰 Beklenen Ücret', value: listData.expectedFee || 'Belirtilmemiş', inline: true },
                    { name: '💵 Oyuncu Maaşı', value: listData.playerSalary || 'Belirtilmemiş', inline: true },
                    { name: '📝 Transfer Türü', value: listData.reason || 'Belirtilmemiş', inline: true },
                    { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Global Log - ${guildName}` });

            await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Global log gönderme hatası:', error);
        }
    }
}

module.exports = new GlobalLogger();