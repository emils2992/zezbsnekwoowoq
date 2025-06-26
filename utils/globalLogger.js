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

            // Add transfer-specific fields
            if (transferData.player) {
                logEmbed.addField('⚽ Oyuncu', transferData.player, true);
            }
            if (transferData.fromTeam) {
                logEmbed.addField('📤 Eski Takım', transferData.fromTeam, true);
            }
            if (transferData.toTeam) {
                logEmbed.addField('📥 Yeni Takım', transferData.toTeam, true);
            }
            if (transferData.amount) {
                logEmbed.addField('💰 Ücret', transferData.amount, true);
            }
            if (transferData.salary) {
                logEmbed.addField('💵 Maaş', transferData.salary, true);
            }
            if (transferData.duration) {
                logEmbed.addField('📅 Süre', transferData.duration, true);
            }
            if (transferData.reason) {
                logEmbed.addField('📝 Sebep', transferData.reason, false);
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
                    { name: '👑 Başkan', value: listData.president, inline: true },
                    { name: '💰 Beklenen Ücret', value: listData.expectedFee || 'Belirtilmemiş', inline: true },
                    { name: '📝 Sebep', value: listData.reason || 'Belirtilmemiş', inline: true },
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