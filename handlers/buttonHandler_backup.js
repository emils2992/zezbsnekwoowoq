const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const config = require('../config');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const api = require('../utils/api');
const permissions = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

class ButtonHandler {
    async handleButton(client, interaction) {
        try {
            const customId = interaction.customId;
            const [action, ...params] = customId.split('_');

            switch (action) {
                case 'offer':
                    await this.handleOfferButton(client, interaction, params);
                    break;
                case 'contract':
                    await this.handleContractButton(client, interaction, params);
                    break;
                case 'trade':
                    await this.handleTradeButton(client, interaction, params);
                    break;
                case 'release':
                    await this.handleReleaseButton(client, interaction, params);
                    break;
                case 'role':
                    await this.handleRoleButton(client, interaction, params);
                    break;
                case 'hire':
                    await this.handleHireButton(client, interaction, params);
                    break;
                case 'transfer':
                    if (params[0] === 'info' && params[1] === 'help') {
                        await this.handleTransferInfoHelp(client, interaction);
                    } else if (params[0] === 'roles' && params[1] === 'help') {
                        await this.handleTransferRolesHelp(client, interaction);
                    } else if (params[0] === 'features' && params[1] === 'help') {
                        await this.handleTransferFeaturesHelp(client, interaction);
                    }
                    break;
                case 'contract':
                    if (params[0] === 'player') {
                        await this.handleContractPlayerButton(client, interaction, params.slice(1));
                    } else {
                        await this.handleContractButton(client, interaction, params);
                    }
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Bilinmeyen buton etkileşimi!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Buton işleme hatası:', error);
            try {
                await interaction.reply({ 
                    content: '❌ Buton işlenirken bir hata oluştu!', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error('Hata yanıtı gönderilemedi:', replyError);
            }
        }
    }

    async handleOfferButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const user = interaction.user;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Kabul edildi - transfer duyurusu yap
            await this.sendTransferAnnouncement(guild, {
                type: 'offer',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ **${player.displayName}** teklifi kabul etti!`,
                ephemeral: false
            });
        } else if (buttonType === 'reject') {
            await interaction.reply({
                content: `❌ **${player.displayName}** teklifi reddetti.`,
                ephemeral: false
            });
        }
    }

    async handleContractButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            await this.sendTransferAnnouncement(guild, {
                type: 'contract',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ Sözleşme kabul edildi!`,
                ephemeral: false
            });
        } else if (buttonType === 'reject') {
            await interaction.reply({
                content: `❌ Sözleşme reddedildi.`,
                ephemeral: false
            });
        }
    }

    async handleTradeButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            await this.sendTransferAnnouncement(guild, {
                type: 'trade',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ Takas kabul edildi!`,
                ephemeral: false
            });
        } else if (buttonType === 'reject') {
            await interaction.reply({
                content: `❌ Takas reddedildi.`,
                ephemeral: false
            });
        }
    }

    async handleReleaseButton(client, interaction, params) {
        const [buttonType, playerId, presidentId, releaseType] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Serbest oyuncu rolü ver
            await permissions.makePlayerFree(player);
            
            // Serbest oyuncu duyurusu yap
            await this.sendReleaseTransferAnnouncement(guild, player, {
                embed: interaction.message.embeds[0]
            }, releaseType);

            await interaction.reply({
                content: `✅ Fesih kabul edildi! **${player.displayName}** artık serbest oyuncu.`,
                ephemeral: false
            });

            // Kanal temizleme
            setTimeout(async () => {
                try {
                    if (interaction.channel.name.includes('muzakere')) {
                        await channels.deleteNegotiationChannel(interaction.channel, 'Fesih tamamlandı');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);
        } else if (buttonType === 'reject') {
            await interaction.reply({
                content: `❌ Fesih reddedildi.`,
                ephemeral: false
            });
        }
    }

    async handleHireButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            await this.sendTransferAnnouncement(guild, {
                type: 'hire',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ Transfer kabul edildi!`,
                ephemeral: false
            });
        } else if (buttonType === 'reject') {
            await interaction.reply({
                content: `❌ Transfer reddedildi.`,
                ephemeral: false
            });
        }
    }

    async handleTransferInfoHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('📋 Transfer Sistemi Bilgileri')
            .addField('⚽ Oyuncu Rolleri', 'Futbolcu, Serbest Futbolcu rolleri', true)
            .addField('👑 Yönetim Rolleri', 'Başkan, Transfer Yetkilileri', true)
            .addField('🔄 Transfer Türleri', 'Teklif, Sözleşme, Takas, Fesih', true)
            .addField('📢 Duyuru Sistemi', 'Otomatik transfer duyuruları', false)
            .setTimestamp()
            .setFooter('Transfer Sistemi');

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferRolesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('👥 Rol Yönetimi')
            .addField('🎯 Rol Kurulumu', '.rol komutu ile roller ayarlanır', false)
            .addField('🔑 Yetki Sistemi', 'Başkanlar transfer yapabilir', false)
            .addField('⚽ Oyuncu Durumu', 'Futbolcu/Serbest rolleri otomatik', false)
            .setTimestamp()
            .setFooter('Rol Yönetimi');

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferFeaturesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('⚡ Sistem Özellikleri')
            .addField('🤖 Otomatik Duyurular', 'Transfer tamamlandığında otomatik bildirim', false)
            .addField('💬 Müzakere Kanalları', 'Özel görüşme kanalları oluşturulur', false)
            .addField('📊 Form Sistemi', 'Detaylı transfer bilgileri', false)
            .setTimestamp()
            .setFooter('Sistem Özellikleri');

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleRoleButton(client, interaction, params) {
        const [roleType, roleId] = params;
        const guild = interaction.guild;
        
        // Rol ayarlama işlemi
        permissions.setRole(guild.id, roleType, roleId);
        
        await interaction.reply({
            content: `✅ ${roleType} rolü başarıyla ayarlandı!`,
            ephemeral: true
        });
    }

    async handleContractPlayerButton(client, interaction, params) {
        // Sözleşme oyuncu butonu işlemi
        await interaction.reply({
            content: 'Sözleşme işlemi başlatıldı.',
            ephemeral: true
        });
    }

    async sendTransferAnnouncement(guild, transferData) {
        const announcementChannel = await channels.findAnnouncementChannel(guild);
        if (!announcementChannel) return;

        const { type, player, president, embed } = transferData;
        const embedFields = embed.fields || [];
        
        let announcementEmbed;
        
        if (type === 'trade') {
            // Takas için özel format
            const playerField = embedFields.find(f => f.name.includes('Oyuncu'));
            const targetPlayerField = embedFields.find(f => f.name.includes('İstenen Oyuncu'));
            
            const playerName = playerField ? playerField.value.replace(/<@!?\d+>/g, '').trim() : player.displayName;
            const targetPlayerName = targetPlayerField ? targetPlayerField.value : 'Bilinmiyor';
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('🔄 Takas Gerçekleşti!')
                .setDescription(`**${playerName}** <> **${targetPlayerName}**\n\n**Başkanlar takasladi**`)
                .setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter('Transfer Duyuruları');
        } else {
            // Diğer transfer türleri için normal format
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Süre'));
            const teamField = embedFields.find(f => f.name.includes('Kulüp') || f.name.includes('Takım'));
            
            const salary = salaryField ? salaryField.value : 'Belirtilmemiş';
            const duration = durationField ? durationField.value : 'Belirtilmemiş';
            const team = teamField ? teamField.value : president.displayName;
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Gerçekleşti!')
                .addField('⚽ Oyuncu', player.displayName, true)
                .addField('🏟️ Yeni Kulüp', team, true)
                .addField('💰 Maaş', salary, true)
                .addField('📅 Süre', duration, true)
                .setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter('Transfer Duyuruları');
        }

        // Ping rollerini kontrol et ve ekle - appropriate ping role based on transfer type
        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        // Use transferPingRole for general transfers
        const pingRoleId = roleData.transferPingRole || roleData.transferPing;
        if (pingRoleId) {
            const pingRole = guild.roles.cache.get(pingRoleId);
            if (pingRole) {
                mention = `<@&${pingRoleId}>`;
            }
        }

        await announcementChannel.send({
            content: mention,
            embeds: [announcementEmbed]
        });
    }

    async sendReleaseTransferAnnouncement(guild, player, releaseData, releaseType) {
        const freeAgentChannel = await channels.findFreeAgentChannel(guild);
        if (!freeAgentChannel) return;

        const embed = releaseData.embed;
        const embedFields = embed.fields || [];
        
        // Embed alanlarından bilgileri çıkar
        const oldClubField = embedFields.find(f => f.name.includes('Eski Kulüp'));
        const reasonField = embedFields.find(f => f.name.includes('Sebep'));
        const compensationField = embedFields.find(f => f.name.includes('Tazminat'));
        
        const oldClub = oldClubField ? oldClubField.value : 'Bilinmiyor';
        const reason = reasonField ? reasonField.value : 'Karşılıklı anlaşma';
        const compensation = compensationField ? compensationField.value : null;
        
        const releaseEmbed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle('🆓 Serbest Oyuncu')
            .addField('⚽ Oyuncu', player.displayName, true)
            .addField('🏟️ Eski Kulüp', oldClub, true)
            .addField('📋 Fesih Türü', releaseType === 'mutual' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih', true)
            .addField('💭 Sebep', reason, false)
            .setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter('Serbest Oyuncu Duyuruları');
        
        if (compensation) {
            releaseEmbed.addField('💰 Tazminat', compensation, true);
        }

        // Ping rollerini kontrol et
        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        if (roleData.freeAgentPing) {
            const pingRole = guild.roles.cache.get(roleData.freeAgentPing);
            if (pingRole) {
                mention = `<@&${roleData.freeAgentPing}>`;
            }
        }

        await freeAgentChannel.send({
            content: mention,
            embeds: [releaseEmbed]
        });
    }
}

module.exports = ButtonHandler;