const { Constants } = require('discord.js');
const config = require('../config');

class ChannelManager {
    async createNegotiationChannel(guild, user1, user2, type, player = null, allowPresidentsInPlayerChannel = true) {
        try {
            // Get display names from guild members
            const member1 = guild.members.cache.get(user1.id);
            const member2 = guild.members.cache.get(user2.id);
            const displayName1 = member1 ? member1.displayName : user1.username;
            const displayName2 = member2 ? member2.displayName : user2.username;
            
            console.log(`[CHANNEL] Creating ${type} channel for ${displayName1} and ${displayName2}`);
            // Kanal adını oluştur
            let channelName;
            switch (type) {
                case 'offer':
                    channelName = `teklif-${displayName1}-${displayName2}`;
                    break;
                case 'contract':
                    channelName = `sozlesme-${displayName1}-${displayName2}`;
                    break;
                case 'hire':
                    channelName = `kiralik-${displayName1}-${displayName2}`;
                    break;
                case 'trade':
                    channelName = `takas-${displayName1}-${displayName2}`;
                    break;
                case 'hire_player':
                    channelName = `m-zakere-${displayName1}-${displayName2}`;
                    break;
                case 'contract_player':
                    channelName = `m-zakere-${displayName1}-${displayName2}`;
                    break;
                case 'trade_player':
                    channelName = `m-zakere-${displayName1}-${displayName2}`;
                    break;
                case 'release':
                    channelName = `fesih-${displayName1}-${displayName2}`;
                    break;
                default:
                    channelName = `müzakere-${displayName1}-${displayName2}`;
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

            // For player approval channels, control president visibility
            if (type.includes('_player')) {
                if (!allowPresidentsInPlayerChannel && (type === 'hire_player' || type === 'contract_player')) {
                    // For hire and contract player channels, only player should see
                    console.log(`[CHANNEL] Creating ${type} channel - player only visibility`);
                    // Override permissions to only allow the player (user2) to see
                    permissionOverwrites.length = 1; // Keep only @everyone deny
                    permissionOverwrites.push({
                        id: user2.id, // Only the player
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                    });
                } else if (type === 'trade_player' && allowPresidentsInPlayerChannel) {
                    // For trade player channels, allow presidents to see by adding them
                    console.log(`[CHANNEL] Creating ${type} channel with president visibility`);
                    // Presidents will already have access through user1/user2 in trade channels
                }
            }

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

            console.log(`[CHANNEL] Creating channel with name: ${channelName}`);
            console.log(`[CHANNEL] Category:`, category ? category.name : 'No category');
            
            // Check category channel count before creation
            const categoryChannels = guild.channels.cache.filter(ch => ch.parentId === category.id);
            console.log(`[CHANNEL] Category has ${categoryChannels.size} channels`);
            
            if (categoryChannels.size >= 45) {
                console.log(`[CHANNEL] Category approaching limit, cleaning up old channels...`);
                const deletedCount = await this.cleanupOldChannels(guild);
                console.log(`[CHANNEL] Cleaned up ${deletedCount} old channels`);
            }

            // Kanalı oluştur
            const channel = await guild.channels.create(channelName, {
                type: 'GUILD_TEXT',
                parent: category,
                permissionOverwrites: permissionOverwrites,
                topic: `${type} müzakeresi - ${user1.username} & ${user2.username}${player ? ` (Oyuncu: ${player.username})` : ''}`
            });
            
            console.log(`[CHANNEL] Successfully created channel: ${channel.name}`);

            // Kullanıcıları etiketleyerek hoş geldin mesajı gönder
            const typeNames = {
                'offer': 'TRANSFER TEKLİFİ',
                'contract': 'SÖZLEŞME',
                'trade': 'TAKAS',
                'hire': 'KİRALIK',
                'release': 'FESİH'
            };
            
            const typeName = typeNames[type] || type.toUpperCase();
            const welcomeMessage = `${user1} ${user2}\n\n🏈 **${typeName} Müzakeresi Başladı**\n\nBu kanalda transfer detaylarını görüşebilirsiniz. Formu doldurup onay/red verebilirsiniz.`;
            await channel.send(welcomeMessage);

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
            console.error('[CHANNEL] Creation error:', error);
            console.error('[CHANNEL] Error details:', error.message);
            
            // If category is full (error code 50035), attempt cleanup and retry
            if (error.code === 50035) {
                console.log(`[CHANNEL] Category full, attempting cleanup and retry...`);
                const deletedCount = await this.cleanupOldChannels(guild);
                console.log(`[CHANNEL] Cleaned up ${deletedCount} channels, retrying creation...`);
                
                try {
                    const retryChannel = await guild.channels.create(channelName, {
                        type: 'GUILD_TEXT',
                        parent: category,
                        permissionOverwrites: permissionOverwrites,
                        topic: `${type} müzakeresi - ${user1.username} & ${user2.username}${player ? ` (Oyuncu: ${player.username})` : ''}`
                    });
                    
                    console.log(`[CHANNEL] Successfully created channel after cleanup: ${retryChannel.name}`);
                    
                    // Send welcome message
                    const typeNames = {
                        'offer': 'TRANSFER TEKLİFİ',
                        'contract': 'SÖZLEŞME',
                        'trade': 'TAKAS',
                        'hire': 'KİRALIK',
                        'release': 'FESİH'
                    };
                    
                    const typeName = typeNames[type] || type.toUpperCase();
                    const welcomeMessage = `${user1} ${user2}\n\n🏈 **${typeName} Müzakeresi Başladı**\n\nBu kanalda transfer detaylarını görüşebilirsiniz. Formu doldurup onay/red verebilirsiniz.`;
                    await retryChannel.send(welcomeMessage);
                    
                    return retryChannel;
                } catch (retryError) {
                    console.log(`[CHANNEL] Retry failed: ${retryError.message}`);
                    return null;
                }
            }
            
            console.error('[CHANNEL] Stack trace:', error.stack);
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
            console.log('Guild data for announcement channel:', guildData);
            
            if (guildData && guildData.announcementChannel) {
                console.log('Looking for channel ID:', guildData.announcementChannel);
                const channel = guild.channels.cache.get(guildData.announcementChannel);
                console.log('Found channel:', channel ? channel.name : 'NOT FOUND');
                if (channel) return channel;
            }
        } catch (error) {
            console.log('Ayarlanmış duyuru kanalı bulunamadı:', error);
        }
        
        // Fallback - try to find transfer announcement channels by name
        console.log('Trying fallback channel search...');
        const channelNames = ['transfer-duyuru', 'transfer-duyurusu', 'transfer-duyurular', 'duyuru', 'duyurular', 'announcements'];
        
        for (const name of channelNames) {
            const channel = guild.channels.cache.find(c => 
                c.type === 'GUILD_TEXT' && 
                c.name.toLowerCase().includes(name.toLowerCase())
            );
            if (channel) {
                console.log('Found fallback channel:', channel.name);
                return channel;
            }
        }
        
        return null;
    }

    async createFreeAgentAnnouncement(guild, player, reason = 'Sözleşme feshi', releaseData = null) {
        try {
            const freeAgentChannel = await this.findFreeAgentChannel(guild);
            
            if (!freeAgentChannel) {
                console.log('Serbest futbolcu kanalı bulunamadı');
                return null;
            }

            const config = require('../config');
            const { MessageEmbed } = require('discord.js');

            // Create detailed release announcement using same format as regular release
            const embed = new MessageEmbed()
                .setColor(config.colors.warning)
                .setTitle('🆓 Serbest Futbolcu')
                .setDescription(`${player.user} artık serbest futbolcu!`)
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Add release details if provided (from brelease/btrelease forms)
            if (releaseData) {
                if (releaseData.oldClub) embed.addFields({ name: '🏟️ Eski Kulüp', value: releaseData.oldClub, inline: true });
                if (releaseData.reason) embed.addFields({ name: '📝 Fesih Nedeni', value: releaseData.reason, inline: true });
                if (releaseData.compensation) embed.addFields({ name: '💰 Tazminat', value: releaseData.compensation, inline: true });
                if (releaseData.newTeam) embed.addFields({ name: '🎯 Yeni Takım', value: releaseData.newTeam, inline: true });
            } else {
                embed.addFields({ name: '📝 Sebep', value: reason, inline: true });
            }

            embed.addFields({ name: '📞 İletişim', value: 'Transfer teklifleri için `.offer` komutunu kullanın', inline: false });

            // Get serbest ping role
            const permissions = require('./permissions');
            const roleData = permissions.getRoleData(guild.id);
            let mentionText = '';

            console.log('Looking for serbestPingRole:', roleData);
            if (roleData && roleData.serbestPingRole) {
                const pingRole = guild.roles.cache.get(roleData.serbestPingRole);
                console.log('Found ping role:', pingRole ? pingRole.name : 'NOT FOUND');
                if (pingRole) {
                    mentionText = `${pingRole} `;
                }
            }

            const message = await freeAgentChannel.send({
                content: `${mentionText}🆓 **Yeni Serbest Futbolcu Duyurusu**`,
                embeds: [embed]
            });

            console.log('Serbest duyuru sent with ping:', mentionText);
            return message;

        } catch (error) {
            console.error('Serbest futbolcu duyurusu hatası:', error);
            return null;
        }
    }

    async cleanupOldChannels(guild) {
        console.log('🧹 Starting cleanup of old negotiation channels...');
        let deletedCount = 0;
        
        try {
            const category = guild.channels.cache.find(c => 
                c.type === 'GUILD_CATEGORY' && 
                c.name.toLowerCase().includes('müzakere')
            );

            if (!category) {
                console.log('❌ Müzakere kategorisi bulunamadı');
                return deletedCount;
            }

            const channels = Array.from(category.children.values());
            console.log(`Found ${channels.length} channels in category`);
            
            // Sort by creation time, oldest first
            channels.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            
            // More aggressive cleanup when category is full
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000); // 30 minutes
            const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour

            for (const channel of channels) {
                if (channel.type === 'GUILD_TEXT') {
                    try {
                        // Check for negotiation channel patterns
                        const isNegotiationChannel = channel.name.includes('muzakere') || 
                                                   channel.name.includes('teklif') || 
                                                   channel.name.includes('sozlesme') ||
                                                   channel.name.includes('takas') ||
                                                   channel.name.includes('kiralik') ||
                                                   channel.name.includes('fesih');
                        
                        if (isNegotiationChannel) {
                            const channelAge = Date.now() - channel.createdTimestamp;
                            let shouldDelete = false;
                            
                            // When category is full, be very aggressive - delete channels older than 2 minutes
                            if (channelAge > (2 * 60 * 1000)) { // 2 minutes
                                shouldDelete = true;
                            }
                            // Delete channels older than 1 minute with no recent activity
                            else if (channelAge > (1 * 60 * 1000)) { // 1 minute
                                try {
                                    const messages = await channel.messages.fetch({ limit: 1 });
                                    const lastMessage = messages.first();
                                    
                                    if (!lastMessage || (Date.now() - lastMessage.createdTimestamp) > (1 * 60 * 1000)) {
                                        shouldDelete = true;
                                    }
                                } catch (fetchError) {
                                    // If can't fetch messages, assume it's inactive
                                    shouldDelete = true;
                                }
                            }
                            
                            if (shouldDelete) {
                                await channel.delete('Otomatik temizlik - Kategori limit aşımı');
                                deletedCount++;
                                console.log(`🗑️ Deleted old channel: ${channel.name}`);
                                
                                // Stop after cleaning 15 channels to avoid rate limits
                                if (deletedCount >= 15) {
                                    console.log(`✅ Cleanup limit reached: ${deletedCount} channels deleted`);
                                    break;
                                }
                                
                                // Add delay to avoid rate limits
                                await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        }
                    } catch (error) {
                        console.log(`❌ Error cleaning up channel ${channel.name}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('Kanal temizleme hatası:', error);
        }
        
        console.log(`✅ Cleanup completed: ${deletedCount} channels deleted`);
        return deletedCount;
    }
}

module.exports = new ChannelManager();
