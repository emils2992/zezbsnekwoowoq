const fs = require('fs');
const path = require('path');
const { MessageEmbed } = require('discord.js');

class EconomyLogger {
    constructor() {
        this.logFilePath = path.join(__dirname, '..', 'data', 'economyLogs.json');
        this.ensureLogFile();
    }

    ensureLogFile() {
        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, JSON.stringify({}, null, 2));
        }
    }

    getLogChannel(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.logFilePath, 'utf8'));
            return data[guildId]?.channelId || null;
        } catch (error) {
            return null;
        }
    }

    setLogChannel(guildId, channelId) {
        const data = JSON.parse(fs.readFileSync(this.logFilePath, 'utf8'));
        if (!data[guildId]) {
            data[guildId] = {};
        }
        data[guildId].channelId = channelId;
        fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2));
    }

    async logTransaction(client, guildId, logData) {
        const channelId = this.getLogChannel(guildId);
        if (!channelId) return;

        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return;

            const embed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('💰 Ekonomi İşlemi')
                .setTimestamp();

            switch (logData.type) {
                case 'pay':
                    embed.setDescription(`**Para Transferi**`)
                        .addField('Gönderen', `<@${logData.fromUser}>`, true)
                        .addField('Alan', `<@${logData.toUser}>`, true)
                        .addField('Miktar', `💰 ${logData.amount}`, true);
                    break;

                case 'add':
                    embed.setDescription(`**Para Eklendi**`)
                        .addField('Yetkili', `<@${logData.admin}>`, true)
                        .addField('Hedef', `<@${logData.target}>`, true)
                        .addField('Miktar', `💰 ${logData.amount}`, true);
                    break;

                case 'remove':
                    embed.setDescription(`**Para Çıkarıldı**`)
                        .addField('Yetkili', `<@${logData.admin}>`, true)
                        .addField('Hedef', `<@${logData.target}>`, true)
                        .addField('Miktar', `💰 ${logData.amount}`, true);
                    break;

                case 'work':
                    embed.setDescription(`**Çalışma Geliri**`)
                        .addField('Kullanıcı', `<@${logData.user}>`, true)
                        .addField('Kazanç', `💰 ${logData.earnings}`, true)
                        .addField('Yeni Bakiye', `💰 ${logData.newBalance}`, true);
                    break;

                case 'deposit':
                    embed.setDescription(`**Banka Yatırımı**`)
                        .addField('Kullanıcı', `<@${logData.user}>`, true)
                        .addField('Miktar', `💰 ${logData.amount}`, true)
                        .addField('Yeni Banka Bakiyesi', `🏦 ${logData.newBank}`, true);
                    break;

                case 'withdraw':
                    embed.setDescription(`**Banka Çekimi**`)
                        .addField('Kullanıcı', `<@${logData.user}>`, true)
                        .addField('Miktar', `💰 ${logData.amount}`, true)
                        .addField('Yeni Nakit Bakiye', `💵 ${logData.newCash}`, true);
                    break;

                case 'shop_add':
                    embed.setDescription(`**Mağaza Ürünü Eklendi**`)
                        .addField('Yetkili', `<@${logData.admin}>`, true)
                        .addField('Ürün', logData.item, true)
                        .addField('Fiyat', `💰 ${logData.price}`, true);
                    break;

                case 'shop_buy':
                    embed.setDescription(`**Mağaza Alışverişi**`)
                        .addField('Alıcı', `<@${logData.buyer}>`, true)
                        .addField('Ürün', logData.item, true)
                        .addField('Fiyat', `💰 ${logData.price}`, true);
                    break;

                case 'system':
                    embed.setDescription(`**Sistem Mesajı**`)
                        .addField('Bilgi', logData.message, false);
                    break;
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Economy log error:', error);
        }
    }
}

module.exports = EconomyLogger;