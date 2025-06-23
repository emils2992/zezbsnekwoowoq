const { Constants } = require('discord.js');
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
                    channelName = `sozlesme-${user1.username}-${user2.username}`;
                    break;
                case 'hire':
                    channelName = `kiralik-${user1.username}-${user2.username}`;
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

            // Müzakereler kategorisini bul veya oluştur - en üstte konumlandır
            let category = guild.channels.cache.find(c => 
                c.type === 'GUILD_CATEGORY' && 
                c.name.toLowerCase().includes('müzakere')
            );

            if (!category) {
                category = await guild.channels.create('müzakere-sözleşme', {
                    type: 'GUILD_CATEGORY',
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: ['VIEW_CHANNEL']
                        }
                    ]
                });
                
                // Kategoriyi en üste taşı
                await category.setPosition(0);
            } else {
                // Mevcut kategoriyi de en üste taşı
                await category.setPosition(0);
            }

            // İzinleri ayarla
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: user1.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                },
                {
                    id: user2.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                }
            ];

            // Eğer oyuncu varsa (contract ve trade için) ona da izin ver
            if (player) {
                permissionOverwrites.push({
                    id: player.id,
                    allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                    deny: ['SEND_MESSAGES'] // Oyuncu sadece okuyabilir
                });
            }

            // Transfer yetkililerine erişim ver
            const permissions = require('./permissions');
            const transferAuthorities = permissions.getTransferAuthorities(guild);
            for (const authorityRole of transferAuthorities) {
                permissionOverwrites.push({
                    id: authorityRole.id,
                    allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']
                });
            }

            // Kanalı oluştur
            const channel = await guild.channels.create(channelName, {
                type: 'GUILD_TEXT',
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
        // Serbest futbolcu duyuru kanalını ayarlanmış kanaldan bul
        const fs = require('fs');
        const path = require('path');
        const rolesPath = path.join(__dirname, '../data/roles.json');
        
        try {
            const allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            const guildData = allData[guild.id];
            
            if (guildData && guildData.freeAgentChannel) {
                const channel = guild.channels.cache.get(guildData.freeAgentChannel);
                if (channel) return channel;
            }
        } catch (error) {
            console.log('Ayarlanmış serbest futbolcu kanalı bulunamadı, varsayılan isimlerle aranıyor...');
        }
        
        // Fallback - varsayılan kanal isimlerini ara
        const channelNames = ['serbest-futbolcular', 'serbest-oyuncular', 'free-agents'];
        
        for (const name of channelNames) {
            const channel = guild.channels.cache.find(c => 
                c.type === 'GUILD_TEXT' && 
                c.name.toLowerCase().includes(name)
            );
            if (channel) return channel;
        }

        return null;
    }

    async findAnnouncementChannel(guild) {
        // Duyuru kanalını ayarlanmış kanaldan bul
        const fs = require('fs');
        const path = require('path');
        const rolesPath = path.join(__dirname, '../data/roles.json');
        
        try {
            const allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            const guildData = allData[guild.id];
            
            if (guildData && guildData.announcementChannel) {
                const channel = guild.channels.cache.get(guildData.announcementChannel);
                if (channel) return channel;
            }
        } catch (error) {
            console.log('Ayarlanmış duyuru kanalı bulunamadı');
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
