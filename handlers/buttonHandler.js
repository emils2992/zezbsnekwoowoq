const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
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
            .addField('📢 Duyuru Sistemi', 'Otomatik transfer duyuruları', false).setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferRolesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('👥 Rol Yönetimi')
            .addField('🎯 Rol Kurulumu', '.rol komutu ile roller ayarlanır', false)
            .addField('🔑 Yetki Sistemi', 'Başkanlar transfer yapabilir', false)
            .addField('⚽ Oyuncu Durumu', 'Futbolcu/Serbest rolleri otomatik', false).setTimestamp()
            .setFooter({ text: 'Rol Yönetimi' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferFeaturesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('⚡ Sistem Özellikleri')
            .addField('🤖 Otomatik Duyurular', 'Transfer tamamlandığında otomatik bildirim', false)
            .addField('💬 Müzakere Kanalları', 'Özel görüşme kanalları oluşturulur', false)
            .addField('📊 Form Sistemi', 'Detaylı transfer bilgileri', false).setTimestamp()
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
                .addField('⚽ Oyuncu', player.displayName, true)
                .addField('🏟️ Yeni Kulüp', team, true)
                .addField('💰 Maaş', salary, true)
                .addField('📅 Süre', duration, true).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
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
            .addField('⚽ Oyuncu', player.displayName, true)
            .addField('🏟️ Eski Kulüp', oldClub, true)
            .addField('📋 Fesih Türü', releaseType === 'mutual' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih', true)
            .addField('💭 Sebep', reason, false).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Serbest Oyuncu Duyuruları' });
        
        if (compensation) {
            releaseEmbed.addField('💰 Tazminat', compensation, true);
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
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        // Create negotiation channel for the offer
        const channel = await channels.createNegotiationChannel(guild, president.user, player.user, 'offer');
        if (!channel) {
            return interaction.reply({
                content: '❌ Müzakere kanalı oluşturulamadı!',
                ephemeral: true
            });
        }

        // Create offer embed with form buttons
        const offerEmbed = embeds.createOfferForm(president.user, player.user);
        
        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`offer_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`offer_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌'),
                new MessageButton()
                    .setCustomId(`offer_edit_${playerId}_${presidentId}`)
                    .setLabel('Düzenle')
                    .setStyle('SECONDARY')
                    .setEmoji('✏️')
            );

        await channel.send({
            embeds: [offerEmbed],
            components: [buttons]
        });

        await interaction.reply({
            content: `✅ Teklif müzakeresi ${channel} kanalında başlatıldı!`,
            ephemeral: true
        });
    }

    async handleShowContractForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        // Create negotiation channel for the contract
        const channel = await channels.createNegotiationChannel(guild, president.user, player.user, 'contract');
        if (!channel) {
            return interaction.reply({
                content: '❌ Müzakere kanalı oluşturulamadı!',
                ephemeral: true
            });
        }

        // Create contract embed with form buttons
        const contractEmbed = embeds.createContractForm(president.user, player.user, player.user);
        
        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`contract_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`contract_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌'),
                new MessageButton()
                    .setCustomId(`contract_edit_${playerId}_${presidentId}`)
                    .setLabel('Düzenle')
                    .setStyle('SECONDARY')
                    .setEmoji('✏️')
            );

        await channel.send({
            embeds: [contractEmbed],
            components: [buttons]
        });

        await interaction.reply({
            content: `✅ Sözleşme müzakeresi ${channel} kanalında başlatıldı!`,
            ephemeral: true
        });
    }

    async handleShowTradeForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        // Create negotiation channel for the trade
        const channel = await channels.createNegotiationChannel(guild, president.user, player.user, 'trade');
        if (!channel) {
            return interaction.reply({
                content: '❌ Müzakere kanalı oluşturulamadı!',
                ephemeral: true
            });
        }

        // Create trade embed with form buttons
        const tradeEmbed = embeds.createTradeForm(president.user, player.user, player.user);
        
        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`trade_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`trade_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌'),
                new MessageButton()
                    .setCustomId(`trade_edit_${playerId}_${presidentId}`)
                    .setLabel('Düzenle')
                    .setStyle('SECONDARY')
                    .setEmoji('✏️')
            );

        await channel.send({
            embeds: [tradeEmbed],
            components: [buttons]
        });

        await interaction.reply({
            content: `✅ Takas müzakeresi ${channel} kanalında başlatıldı!`,
            ephemeral: true
        });
    }

    async handleShowHireForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        // Create negotiation channel for the hire
        const channel = await channels.createNegotiationChannel(guild, president.user, player.user, 'hire');
        if (!channel) {
            return interaction.reply({
                content: '❌ Müzakere kanalı oluşturulamadı!',
                ephemeral: true
            });
        }

        // Create hire embed with form buttons
        const hireEmbed = embeds.createHireForm(president.user, player.user, player.user);
        
        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`hire_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`hire_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌'),
                new MessageButton()
                    .setCustomId(`hire_edit_${playerId}_${presidentId}`)
                    .setLabel('Düzenle')
                    .setStyle('SECONDARY')
                    .setEmoji('✏️')
            );

        await channel.send({
            embeds: [hireEmbed],
            components: [buttons]
        });

        await interaction.reply({
            content: `✅ Kiralık müzakeresi ${channel} kanalında başlatıldı!`,
            ephemeral: true
        });
    }

    async handleShowAnnouncementForm(client, interaction, params) {
        await interaction.reply({
            content: `${config.emojis.football} **Duyuru Formu**\n\nLütfen duyuru bilgilerinizi şu formatta yazın:\n\`\`\`\nOyuncu: [Oyuncu Adı]\nYeni Kulüp: [Kulüp Adı]\nMaaş: [Maaş Bilgisi]\nSözleşme: [Süre]\nBonus: [Bonus Bilgisi]\n\`\`\`\n\nÖrnek:\n\`\`\`\nOyuncu: Lionel Messi\nYeni Kulüp: Galatasaray\nMaaş: 6.000.000₺/yıl\nSözleşme: 2 yıl\nBonus: 250.000₺\n\`\`\``,
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