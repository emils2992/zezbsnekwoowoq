const { MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const config = require('../config');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const permissions = require('../utils/permissions');

class ButtonHandler {
    async handleButton(client, interaction) {
        try {
            const customId = interaction.customId;
            const [action, ...params] = customId.split('_');
            console.log(`Button interaction: ${customId} | Action: ${action} | Params: ${params.join(', ')}`);

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
                case 'hire':
                    await this.handleHireButton(client, interaction, params);
                    break;
                case 'show':
                    await this.handleShowButton(client, interaction, params);
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
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
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

        if (buttonType === 'accept') {
            await permissions.makePlayerFree(player);
            
            await this.sendReleaseTransferAnnouncement(guild, player, {
                embed: interaction.message.embeds[0]
            }, releaseType);

            await interaction.reply({
                content: `✅ Fesih kabul edildi! **${player.displayName}** artık serbest oyuncu.`,
                ephemeral: false
            });

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
            .addFields({ name: '📢 Duyuru Sistemi', value: 'Otomatik transfer duyuruları', inline: false }).setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferRolesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('👥 Rol Yönetimi')
            .addFields({ name: '🎯 Rol Kurulumu', value: '.rol komutu ile roller ayarlanır', inline: false }, { name: '🔑 Yetki Sistemi', value: 'Başkanlar transfer yapabilir', inline: false }, { name: '⚽ Oyuncu Durumu', value: 'Futbolcu/Serbest rolleri otomatik', inline: false }).setTimestamp()
            .setFooter({ text: 'Rol Yönetimi' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferFeaturesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('⚡ Sistem Özellikleri')
            .addFields({ name: '🤖 Otomatik Duyurular', value: 'Transfer tamamlandığında otomatik bildirim', inline: false }, { name: '💬 Müzakere Kanalları', value: 'Özel görüşme kanalları oluşturulur', inline: false }, { name: '📊 Form Sistemi', value: 'Detaylı transfer bilgileri', inline: false }).setTimestamp()
            .setFooter({ text: 'Sistem Özellikleri' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async sendTransferAnnouncement(guild, transferData) {
        const announcementChannel = await channels.findAnnouncementChannel(guild);
        if (!announcementChannel) return;

        const { type, player, president, embed } = transferData;
        const embedFields = embed.fields || [];
        
        let announcementEmbed;
        
        if (type === 'trade') {
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
                .setFooter({ text: 'Transfer Duyuruları' });
        } else {
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Süre'));
            const teamField = embedFields.find(f => f.name.includes('Kulüp') || f.name.includes('Takım'));
            
            const salary = salaryField ? salaryField.value : 'Belirtilmemiş';
            const duration = durationField ? durationField.value : 'Belirtilmemiş';
            const team = teamField ? teamField.value : president.displayName;
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Gerçekleşti!')
                .addFields({ name: '⚽ Oyuncu', value: player.displayName, inline: true }, { name: '🏟️ Yeni Kulüp', value: team, inline: true }, { name: '💰 Maaş', value: salary, inline: true }, { name: '📅 Süre', value: duration, inline: true }).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Duyuruları' });
        }

        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        if (roleData.transferPing) {
            const pingRole = guild.roles.cache.get(roleData.transferPing);
            if (pingRole) {
                mention = `<@&${roleData.transferPing}>`;
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
        
        const oldClubField = embedFields.find(f => f.name.includes('Eski Kulüp'));
        const reasonField = embedFields.find(f => f.name.includes('Sebep'));
        const compensationField = embedFields.find(f => f.name.includes('Tazminat'));
        
        const oldClub = oldClubField ? oldClubField.value : 'Bilinmiyor';
        const reason = reasonField ? reasonField.value : 'Karşılıklı anlaşma';
        const compensation = compensationField ? compensationField.value : null;
        
        const releaseEmbed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle('🆓 Serbest Oyuncu')
            .addFields({ name: '⚽ Oyuncu', value: player.displayName, inline: true }, { name: '🏟️ Eski Kulüp', value: oldClub, inline: true }, { name: '📋 Fesih Türü', value: releaseType === 'mutual' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih', inline: true }, { name: '💭 Sebep', value: reason, inline: false }).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Serbest Oyuncu Duyuruları' });
        
        if (compensation) {
            releaseEmbed.addFields({ name: '💰 Tazminat', value: compensation, inline: true });
        }

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

    async handleShowButton(client, interaction, params) {
        const [type, ...additionalParams] = params;
        
        switch (type) {
            case 'offer':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowOfferForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'contract':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowContractForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'trade':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowTradeForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'hire':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowHireForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'announcement':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowAnnouncementForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'release':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowReleaseForm(client, interaction, additionalParams.slice(1));
                }
                break;
            default:
                await interaction.reply({
                    content: `❌ Bilinmeyen form türü: ${type}`,
                    ephemeral: true
                });
        }
    }

    async handleShowOfferForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`offer_form_${playerId}_${presidentId}`)
            .setTitle('Transfer Teklifi Formu');

        const teamNameInput = new TextInputComponent()
            .setCustomId('team_name')
            .setLabel('Takım Adı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Galatasaray')
            .setRequired(true);

        const playerNameInput = new TextInputComponent()
            .setCustomId('player_name')
            .setLabel('Oyuncu Adı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Lionel Messi')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Yıllık Maaş')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 6.000.000₺/yıl')
            .setRequired(true);

        const contractYearsInput = new TextInputComponent()
            .setCustomId('contract_years')
            .setLabel('Sözleşme Süresi')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl')
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonuslar')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 250.000₺')
            .setRequired(false);

        const row1 = new MessageActionRow().addComponents(teamNameInput);
        const row2 = new MessageActionRow().addComponents(playerNameInput);
        const row3 = new MessageActionRow().addComponents(salaryInput);
        const row4 = new MessageActionRow().addComponents(contractYearsInput);
        const row5 = new MessageActionRow().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    }

    async handleShowContractForm(client, interaction, params) {
        await interaction.reply({
            content: 'Discord.js v13 modal desteği yok. Lütfen komutları kullanın.',
            ephemeral: true
        });
    }

    async handleShowTradeForm(client, interaction, params) {
        await interaction.reply({
            content: 'Discord.js v13 modal desteği yok. Lütfen komutları kullanın.',
            ephemeral: true
        });
    }

    async handleShowHireForm(client, interaction, params) {
        await interaction.reply({
            content: 'Discord.js v13 modal desteği yok. Lütfen komutları kullanın.',
            ephemeral: true
        });
    }

    async handleShowAnnouncementForm(client, interaction, params) {
        await interaction.reply({
            content: 'Discord.js v13 modal desteği yok. Lütfen komutları kullanın.',
            ephemeral: true
        });
    }

    async handleShowReleaseForm(client, interaction, params) {
        const [playerId, presidentId, releaseType] = params;
        
        const modal = new Modal()
            .setCustomId(`release_form_${playerId}_${presidentId}_${releaseType}`)
            .setTitle('Karşılıklı Fesih Formu');

        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Galatasaray')
            .setRequired(true);

        const reasonInput = new TextInputComponent()
            .setCustomId('reason')
            .setLabel('Fesih Sebebi')
            .setStyle('PARAGRAPH')
            .setPlaceholder('Örn: Karşılıklı anlaşma ile ayrılık')
            .setRequired(true);

        const compensationInput = new TextInputComponent()
            .setCustomId('compensation')
            .setLabel('Tazminat Miktarı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 500.000₺')
            .setRequired(false);

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Takım (İsteğe Bağlı)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Henüz belirlenmedi')
            .setRequired(false);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonuslar (İsteğe Bağlı)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 0₺')
            .setRequired(false);

        const row1 = new MessageActionRow().addComponents(oldClubInput);
        const row2 = new MessageActionRow().addComponents(reasonInput);
        const row3 = new MessageActionRow().addComponents(compensationInput);
        const row4 = new MessageActionRow().addComponents(newTeamInput);
        const row5 = new MessageActionRow().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    }
}

module.exports = ButtonHandler;