const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

class ChannelManager {
    async createNegotiationChannel(guild, user1, user2, type, player = null) {
        try {
            // Kanal adını oluştur
            let channelName;
            switch (type) {
                case 'offer':
                    channelName = `teklif-${user1.username}-${user2.username}`;
                    break;
                case 'contract':
                    channelName = `sözleşme-${user1.username}-${user2.username}`;
                    break;
                case 'trade':
                    channelName = `takas-${user1.username}-${user2.username}`;
                    break;
                default:
                    channelName = `müzakere-${user1.username}-${user2.username}`;
            }

            // Kanal ismini Discord kurallarına uygun hale getir
            channelName = channelName
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 100);

            // Müzakereler kategorisini bul veya oluştur
            let category = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildCategory && 
                c.name.toLowerCase().includes('müzakere')
            );

            if (!category) {
                category = await guild.channels.create({
                    name: '🤝 Müzakereler',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });
            }

            // İzinleri ayarla
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user1.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: user2.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            // Eğer oyuncu varsa (contract ve trade için) ona da izin ver
            if (player) {
                permissionOverwrites.push({
                    id: player.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages] // Oyuncu sadece okuyabilir
                });
            }

            // Kanalı oluştur
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: permissionOverwrites,
                topic: `${type} müzakeresi - ${user1.username} & ${user2.username}${player ? ` (Oyuncu: ${player.username})` : ''}`
            });

            // 24 saat sonra kanalı sil
            setTimeout(async () => {
                try {
                    if (channel && !channel.deleted) {
                        await channel.delete('Müzakere süresi doldu');
                    }
                } catch (error) {
                    console.log('Kanal silme hatası:', error.message);
                }
            }, 24 * 60 * 60 * 1000); // 24 saat

            return channel;

        } catch (error) {
            console.error('Müzakere kanalı oluşturma hatası:', error);
            return null;
        }
    }

    async deleteNegotiationChannel(channel, reason = 'Müzakere tamamlandı') {
        try {
            if (channel && !channel.deleted) {
                await channel.delete(reason);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Kanal silme hatası:', error);
            return false;
        }
    }

    async findFreeAgentChannel(guild) {
        // Serbest futbolcu duyuru kanalını bul
        const channelNames = ['serbest-futbolcular', 'serbest-oyuncular', 'free-agents'];
        
        for (const name of channelNames) {
            const channel = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildText && 
                c.name.toLowerCase().includes(name)
            );
            if (channel) return channel;
        }

        return null;
    }

    async createFreeAgentAnnouncement(guild, player, reason = 'Sözleşme feshi') {
        try {
            const freeAgentChannel = await this.findFreeAgentChannel(guild);
            
            if (!freeAgentChannel) {
                console.log('Serbest futbolcu kanalı bulunamadı');
                return null;
            }

            const embed = require('./embeds').createSuccess(
                'Yeni Serbest Futbolcu',
                `**${player.username}** artık serbest futbolcu!\n\n**Sebep:** ${reason}\n\nTransfer teklifleri için DM atabilir veya \`.offer\` komutunu kullanabilirsiniz.`
            );

            embed.setThumbnail(player.displayAvatarURL({ dynamic: true }));
            embed.addFields({ name: '📊 Oyuncu Bilgileri', value: 'Detaylar için oyuncuyla iletişime geçin', inline: false });

            const message = await freeAgentChannel.send({
                content: `${config.emojis.football} **Yeni Serbest Futbolcu Duyurusu**`,
                embeds: [embed]
            });

            return message;

        } catch (error) {
            console.error('Serbest futbolcu duyurusu hatası:', error);
            return null;
        }
    }

    async cleanupOldChannels(guild) {
        try {
            const category = guild.channels.cache.find(c => 
                c.type === 'GUILD_CATEGORY' && 
                c.name.toLowerCase().includes('müzakere')
            );

            if (!category) return;

            const channels = category.children;
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

            for (const [channelId, channel] of channels) {
                if (channel.type === 'GUILD_TEXT' && channel.createdTimestamp < oneDayAgo) {
                    try {
                        await channel.delete('Otomatik temizlik - 24 saat geçti');
                        console.log(`Eski müzakere kanalı silindi: ${channel.name}`);
                    } catch (error) {
                        console.log(`Kanal silme hatası: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            console.error('Kanal temizleme hatası:', error);
        }
    }
}

module.exports = new ChannelManager();
