const { MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const config = require('../config');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const permissions = require('../utils/permissions');

class ButtonHandler {
    constructor() {
        this.processedInteractions = new Set();
    }

    async handleButton(client, interaction) {
        try {
            // Prevent multiple clicks on the same button
            const interactionKey = `${interaction.message.id}_${interaction.customId}_${interaction.user.id}`;
            if (this.processedInteractions.has(interactionKey)) {
                return interaction.reply({
                    content: '❌ Bu butona zaten tıkladınız!',
                    ephemeral: true
                });
            }

            const customId = interaction.customId;
            const [action, ...params] = customId.split('_');
            console.log(`Button interaction: ${customId} | Action: ${action} | Params: ${params.join(', ')}`);

            // Add to processed interactions for accept/reject/confirm buttons
            if (params[0] === 'accept' || params[0] === 'reject' || params[0] === 'confirm') {
                this.processedInteractions.add(interactionKey);
                
                // Remove from set after 5 minutes to prevent memory leaks
                setTimeout(() => {
                    this.processedInteractions.delete(interactionKey);
                }, 5 * 60 * 1000);
            }

            switch (action) {
                case 'offer':
                    await this.handleOfferButton(client, interaction, params);
                    break;
                case 'contract':
                    // Check if it's a player-specific contract button
                    if (customId.includes('contract_player_')) {
                        await this.handleContractPlayerButton(client, interaction, params);
                    } else {
                        await this.handleContractButton(client, interaction, params);
                    }
                    break;
                case 'contract_player':
                    await this.handleContractPlayerButton(client, interaction, params);
                    break;
                case 'trade':
                    if (params[0] === 'player') {
                        await this.handleTradePlayerButton(client, interaction, params.slice(1));
                    } else {
                        await this.handleTradeButton(client, interaction, params);
                    }
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
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri teklifi kabul edebilir!',
                    ephemeral: true
                });
            }

            console.log('OFFER ACCEPTED - Sending transfer announcement');
            await this.sendTransferAnnouncement(guild, {
                type: 'offer',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });
            console.log('TRANSFER ANNOUNCEMENT SENT');

            // Role management - remove free agent role and add player role
            const permissions = require('../utils/permissions');
            try {
                // Remove free agent role
                await permissions.signPlayer(player);
                console.log(`Removed free agent role and added player role for ${player.displayName}`);
            } catch (error) {
                console.error('Role management error:', error);
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `✅ Transfer kabul edildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri teklifi reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Transfer reddedildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'edit') {
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditOfferModal(client, interaction, playerId, presidentId);
        }
    }

    async handleContractButton(client, interaction, params) {
        const [buttonType, targetPresidentId, playerId, presidentId] = params;
        const guild = interaction.guild;
        
        console.log('Contract button debug:', { buttonType, targetPresidentId, playerId, presidentId });
        
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);
        const targetPresident = await guild.members.fetch(targetPresidentId);

        if (buttonType === 'accept') {
            // Check if user is the target president or transfer authority
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri sözleşme teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            // İkinci aşama: Oyuncu ile müzakere kanalı oluştur
            const playerChannel = await channels.createNegotiationChannel(guild, targetPresident.user, player.user, 'contract-player');
            if (!playerChannel) {
                return interaction.editReply({ content: 'Oyuncu müzakere kanalı oluşturulamadı!' });
            }

            // Oyuncu için sözleşme embed'i oluştur
            const contractEmbed = interaction.message.embeds[0];
            const playerButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`contract_player_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`contract_player_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`contract_player_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await playerChannel.send({
                content: `<@${player.id}> Sizin için bir sözleşme teklifi onaylandı! Lütfen karar verin:`,
                embeds: [contractEmbed],
                components: [playerButtons]
            });

            await interaction.editReply({
                content: `✅ Başkan onayı tamamlandı! Oyuncu onayı için ${playerChannel} kanalı oluşturuldu.`
            });

            // Bu kanalı kapat
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Başkan onayı tamamlandı");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 3000);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target president or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri sözleşme teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Sözleşme reddedildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'edit') {
            // Check if user is authorized (president who made contract or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece sözleşme yapan başkan veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditContractModal(client, interaction, targetPresidentId, playerId, presidentId);
        }
    }

    async handleContractPlayerButton(client, interaction, params) {
        // For contract_player_accept_ buttons, params are: ['player', 'accept', 'targetPresidentId', 'playerId', 'presidentId']
        const buttonType = params[1]; // 'accept', 'reject', or 'edit'
        const targetPresidentId = params[2];
        const playerId = params[3];
        const presidentId = params[4];
        const guild = interaction.guild;
        
        console.log('Contract player button debug:', { buttonType, targetPresidentId, playerId, presidentId });
        
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);
        const targetPresident = await guild.members.fetch(targetPresidentId);

        if (buttonType === 'accept') {
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri sözleşme teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            // Final contract acceptance - send announcement
            await this.sendTransferAnnouncement(guild, {
                type: 'contract',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `✅ Sözleşme kabul edildi! Transfer tamamlandı.`
            });

            // Disable all buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Delete channel after announcement
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Transfer tamamlandı");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri sözleşme teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Sözleşme oyuncu tarafından reddedildi!`
            });

            // Disable all buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Delete channel
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Sözleşme reddedildi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);
        } else if (buttonType === 'edit') {
            // Check if user is authorized (target player, president, or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || interaction.user.id === presidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece oyuncu, başkan veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditContractModal(client, interaction, playerId, presidentId);
        }
    }

    async handleTradeButton(client, interaction, params) {
        const [buttonType, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        const guild = interaction.guild;
        const targetPresident = await guild.members.fetch(targetPresidentId);
        const wantedPlayer = await guild.members.fetch(wantedPlayerId);
        const givenPlayer = await guild.members.fetch(givenPlayerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Check if user is authorized (target president only)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri takas teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            // Stage 2: Create channel between the two players for their approval
            const playersChannel = await channels.createNegotiationChannel(guild, wantedPlayer.user, givenPlayer.user, 'trade');
            if (!playersChannel) {
                return interaction.editReply({ content: '❌ Oyuncular için müzakere kanalı oluşturulamadı!' });
            }

            // Add both presidents to the channel so they can edit salaries
            try {
                await playersChannel.permissionOverwrites.create(targetPresident.user, {
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true,
                    READ_MESSAGE_HISTORY: true
                });
                await playersChannel.permissionOverwrites.create(president.user, {
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true,
                    READ_MESSAGE_HISTORY: true
                });
            } catch (error) {
                console.error('Başkanları kanala ekleme hatası:', error);
            }

            // Create player approval embed with placeholder salary information
            const embed = new MessageEmbed()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.trade} Takas Onayı - Oyuncular`)
                .setDescription(`**Başkanlar takas konusunda anlaştı!**\n\nŞimdi her iki oyuncunun da takası onaylaması gerekiyor.\n\n🔄 **Takas Detayları:**\n📈 **İstenen:** ${wantedPlayer.user}\n📉 **Verilecek:** ${givenPlayer.user}`)
                .addFields(
                    { name: '💰 İstenen Oyuncunun Maaşı', value: 'Düzenlenecek', inline: true },
                    { name: '💸 Verilecek Oyuncunun Maaşı', value: 'Düzenlenecek', inline: true },
                    { name: '📅 İstenen Oyuncunun Sözleşme/Ek Madde', value: 'Düzenlenecek', inline: false },
                    { name: '📋 Verilecek Oyuncunun Sözleşme/Ek Madde', value: 'Düzenlenecek', inline: false },
                    { name: '🏟️ Kulüpler', value: `${targetPresident.user.username} ↔ ${president.user.username}`, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi - Maaşları düzenlemek için Düzenle butonuna basın' });

            const playerButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`trade_player_accept_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`trade_player_reject_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`trade_player_edit_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await playersChannel.send({
                embeds: [embed],
                components: [playerButtons]
            });

            await interaction.editReply({
                content: `✅ Takas başkanlar tarafından kabul edildi! Oyuncuların onayı için ${playersChannel} kanalı oluşturuldu.\n\n${wantedPlayer.user} ${givenPlayer.user} ${targetPresident.user} ${president.user} - Lütfen ${playersChannel} kanalına gidin ve takası onaylayın.`
            });

            // Disable current buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Delete current channel after delay
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Başkan onayı tamamlandı - Oyuncu onayına geçildi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target president or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri takas teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Takas reddedildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'edit') {
            // Check if user is authorized (president who made trade or target president for salary adjustments)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan, hedef başkan veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditTradeModal(client, interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
        }
    }

    async handleTradePlayerButton(client, interaction, params) {
        console.log('Trade player button clicked:', { buttonType: buttonType, params: params, userId: interaction.user.id });
        
        const [buttonType, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        const guild = interaction.guild;
        const targetPresident = await guild.members.fetch(targetPresidentId);
        const wantedPlayer = await guild.members.fetch(wantedPlayerId);
        const givenPlayer = await guild.members.fetch(givenPlayerId);
        const president = await guild.members.fetch(presidentId);
        
        console.log(`Trade button debug: User ${interaction.user.id} clicked ${buttonType}, WantedPlayer: ${wantedPlayerId}, GivenPlayer: ${givenPlayerId}`);

        if (buttonType === 'accept') {
            // Check if user is one of the players
            const member = interaction.member;
            const isAuthorizedPlayer = interaction.user.id === wantedPlayerId || interaction.user.id === givenPlayerId;
            const isTransferAuthority = permissions.isTransferAuthority(member);
            
            if (!isAuthorizedPlayer && !isTransferAuthority) {
                return interaction.reply({
                    content: '❌ Sadece takas edilen oyuncular veya transfer yetkilileri onaylayabilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            // Debug user fetching
            console.log(`Fetching users for trade acceptance:`);
            console.log(`targetPresidentId: ${targetPresidentId}`);
            console.log(`wantedPlayerId: ${wantedPlayerId}`);  
            console.log(`givenPlayerId: ${givenPlayerId}`);
            console.log(`presidentId: ${presidentId}`);
            console.log(`User clicking button: ${interaction.user.id}`);

            // Check if this channel already has acceptances stored
            const channelName = interaction.channel.name;
            const acceptanceKey = `trade_acceptances_${channelName}`;
            
            // Initialize acceptances if not exists
            if (!global[acceptanceKey]) {
                global[acceptanceKey] = { wantedPlayer: false, givenPlayer: false };
                console.log(`Initialized acceptance tracking for ${channelName}:`, global[acceptanceKey]);
            }
            
            // Prevent duplicate acceptances
            if ((interaction.user.id === wantedPlayerId && global[acceptanceKey].wantedPlayer) ||
                (interaction.user.id === givenPlayerId && global[acceptanceKey].givenPlayer)) {
                return interaction.editReply({
                    content: `⚠️ Sen zaten takası kabul ettin! Diğer oyuncunun kararı bekleniyor...`
                });
            }

            // Mark this player as accepted - use string comparison for safety
            const userId = interaction.user.id.toString();
            const wantedId = wantedPlayerId.toString();
            const givenId = givenPlayerId.toString();
            
            console.log(`Trade acceptance check: User ${userId} vs Wanted ${wantedId} vs Given ${givenId}`);
            
            if (userId === wantedId) {
                global[acceptanceKey].wantedPlayer = true;
                console.log(`✅ Wanted player ${wantedPlayer.displayName} accepted! Status:`, global[acceptanceKey]);
                await interaction.editReply({
                    content: `✅ **${wantedPlayer.displayName}** takası kabul etti! ${global[acceptanceKey].givenPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
                });
            } else if (userId === givenId) {
                global[acceptanceKey].givenPlayer = true;
                console.log(`✅ Given player ${givenPlayer.displayName} accepted! Status:`, global[acceptanceKey]);
                await interaction.editReply({
                    content: `✅ **${givenPlayer.displayName}** takası kabul etti! ${global[acceptanceKey].wantedPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
                });
            } else {
                console.log(`❌ Unknown user ${userId} (wanted: ${wantedId}, given: ${givenId})`);
                await interaction.editReply({
                    content: `❌ Sen bu takasta yer almıyorsun! (Debug: ${userId})`
                });
                return;
            }

            // Check if both players have accepted after this acceptance
            console.log(`Checking dual acceptance for channel ${channelName}:`, global[acceptanceKey]);
            
            // Use setTimeout to check acceptance after this interaction completes
            setTimeout(async () => {
                if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                    console.log('Both players accepted! Sending announcement...');
                    
                    // Extract trade data from embed for complete announcement
                    const embed = interaction.message.embeds[0];
                    const fields = embed.fields;
                    
                    const tradeData = {
                        wantedPlayerSalary: fields.find(f => f.name.includes('İstenen Oyuncunun Maaşı'))?.value || 'Belirtilmemiş',
                        givenPlayerSalary: fields.find(f => f.name.includes('Verilecek Oyuncunun Maaşı'))?.value || 'Belirtilmemiş',
                        wantedPlayerContract: fields.find(f => f.name.includes('İstenen Oyuncunun Sözleşme'))?.value || 'Belirtilmemiş',
                        givenPlayerContract: fields.find(f => f.name.includes('Verilecek Oyuncunun Sözleşme'))?.value || 'Belirtilmemiş',
                        additionalAmount: fields.find(f => f.name.includes('Ek Miktar'))?.value || 'Yok',
                        bonus: fields.find(f => f.name.includes('Bonus'))?.value || 'Yok'
                    };

                    await this.sendTransferAnnouncement(guild, {
                        type: 'trade',
                        wantedPlayer: wantedPlayer,
                        givenPlayer: givenPlayer,
                        targetPresident: targetPresident,
                        president: president,
                        embed: interaction.message.embeds[0],
                        tradeData: tradeData
                    });

                    // Send completion message to channel
                    await interaction.channel.send({
                        content: `🎉 **HER İKİ OYUNCU DA KABUL ETTİ!** Takas tamamlandı ve otomatik duyuru gönderildi!\n\n${targetPresident.user} ${president.user}`
                    });

                    // Disable all buttons
                    const disabledButtons = interaction.message.components[0].components.map(button => 
                        new MessageButton()
                            .setCustomId(button.customId)
                            .setLabel(button.label)
                            .setStyle(button.style)
                            .setDisabled(true)
                            .setEmoji(button.emoji || null)
                    );

                    await interaction.message.edit({
                        embeds: interaction.message.embeds,
                        components: [new MessageActionRow().addComponents(disabledButtons)]
                    });

                    // Clean up acceptances
                    delete global[acceptanceKey];

                    // Delete channel after delay
                    setTimeout(async () => {
                        try {
                            const channelToDelete = interaction.channel;
                            if (channelToDelete && channelToDelete.deletable) {
                                console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                                await channelToDelete.delete("Takas tamamlandı - Kanal otomatik silindi");
                                console.log('KANAL BAŞARIYLA SİLİNDİ');
                            }
                        } catch (error) {
                            console.error('KANAL SİLME HATASI:', error);
                        }
                    }, 3000);
                }
            }, 500);

        } else if (buttonType === 'reject') {
            // Check if user is one of the players
            const member = interaction.member;
            const isAuthorizedPlayer = interaction.user.id === wantedPlayerId || interaction.user.id === givenPlayerId;
            const isTransferAuthority = permissions.isTransferAuthority(member);
            
            if (!isAuthorizedPlayer && !isTransferAuthority) {
                return interaction.reply({
                    content: '❌ Sadece takas edilen oyuncular veya transfer yetkilileri reddedebilir!',
                    ephemeral: true
                });
            }

            const playerName = interaction.user.id === wantedPlayerId ? wantedPlayer.displayName : givenPlayer.displayName;
            await interaction.deferReply();
            await interaction.editReply({
                content: `❌ **${playerName}** takası reddetti! Müzakere iptal edildi.`
            });

            // Disable all buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Clean up acceptances
            const channelName = interaction.channel.name;
            const acceptanceKey = `trade_acceptances_${channelName}`;
            delete global[acceptanceKey];

            // Delete channel after delay
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Takas reddedildi - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);
        } else if (buttonType === 'edit') {
            // Both presidents can edit the salary details for players
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece başkanlar veya transfer yetkilileri maaş detaylarını düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Show salary editing modal for both players - target president can also edit
            await this.handleShowTradePlayerSalaryForm(client, interaction, [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId]);
        }
    }

    async handleReleaseButton(client, interaction, params) {
        const [buttonType, playerId, presidentId, releaseType] = params;
        
        // Handle trelease confirm/cancel buttons
        if (buttonType === 'confirm') {
            // Check if interaction has already been responded to
            if (interaction.replied || interaction.deferred) {
                return;
            }

            // Check if user is authorized (president who initiated or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece fesih talebini yapan başkan veya transfer yetkilileri onaylayabilir!',
                    ephemeral: true
                });
            }

            // Defer the reply to prevent timeout
            await interaction.deferReply();

            const guild = interaction.guild;
            const player = await guild.members.fetch(playerId);
            const president = await guild.members.fetch(presidentId);

            // Make player free agent
            await permissions.makePlayerFree(player);

            // Extract data from embed for announcement
            const embed = interaction.message.embeds[0];
            const releaseData = {
                oldClub: embed.fields?.find(f => f.name.includes('Başkan'))?.value || president.displayName,
                reason: 'Tek taraflı fesih',
                compensation: 'Yok',
                newTeam: 'Serbest Futbolcu'
            };

            // Send announcement to free agent channel
            await this.sendReleaseTransferAnnouncement(guild, player.user, releaseData, 'unilateral');

            await interaction.editReply({
                content: `✅ **${player.displayName}** tek taraflı fesih ile serbest futbolcu oldu!`
            });

            // Disable all buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            return;
        }

        if (buttonType === 'cancel') {
            // Check if interaction has already been responded to
            if (interaction.replied || interaction.deferred) {
                return;
            }

            // Check if user is authorized (president who initiated or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece fesih talebini yapan başkan veya transfer yetkilileri iptal edebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Tek taraflı fesih talebi iptal edildi.`
            });

            // Disable all buttons
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            return;
        }

        // Regular release button handling for mutual releases
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri fesih teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            await permissions.makePlayerFree(player);
            
            // Extract release data from embed fields
            const embed = interaction.message.embeds[0];
            const releaseData = {
                oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş',
                reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || 'Belirtilmemiş',
                compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || '',
                newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
            };
            
            await this.sendReleaseTransferAnnouncement(guild, player.user, releaseData, releaseType);

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `✅ Fesih kabul edildi! **${player.displayName}** artık serbest oyuncu.`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri fesih teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Fesih reddedildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'edit') {
            // Check if user is authorized (president who made release or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditReleaseModal(client, interaction, playerId, presidentId, releaseType);
        }
    }

    async handleHireButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Check if user is authorized (target president or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri kiralık teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            await this.sendTransferAnnouncement(guild, {
                type: 'hire',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `✅ Kiralık transfer kabul edildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'reject') {
            // Check if user is authorized (target president or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri kiralık teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Kiralık transfer reddedildi!`
            });

            // Disable all buttons immediately
            const disabledButtons = interaction.message.components[0].components.map(button => 
                new MessageButton()
                    .setCustomId(button.customId)
                    .setLabel(button.label)
                    .setStyle(button.style)
                    .setDisabled(true)
                    .setEmoji(button.emoji || null)
            );

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [new MessageActionRow().addComponents(disabledButtons)]
            });

            // Force channel deletion
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("İşlem tamamlandı - Kanal otomatik silindi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    } else {
                        console.log('Kanal silinemez veya bulunamadı');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 1500);

        } else if (buttonType === 'edit') {
            // Sadece komutu kullanan kişi (başkan) düzenleyebilir
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditHireModal(client, interaction, playerId, presidentId);
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
            .addFields(
                { name: '🎯 Rol Kurulumu', value: '.rol komutu ile roller ayarlanır', inline: false },
                { name: '🔑 Yetki Sistemi', value: 'Başkanlar transfer yapabilir', inline: false },
                { name: '⚽ Oyuncu Durumu', value: 'Futbolcu/Serbest rolleri otomatik', inline: false }
            ).setTimestamp()
            .setFooter({ text: 'Rol Yönetimi' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async handleTransferFeaturesHelp(client, interaction) {
        const helpEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle('⚡ Sistem Özellikleri')
            .addFields(
                { name: '🤖 Otomatik Duyurular', value: 'Transfer tamamlandığında otomatik bildirim', inline: false },
                { name: '💬 Müzakere Kanalları', value: 'Özel görüşme kanalları oluşturulur', inline: false },
                { name: '📊 Form Sistemi', value: 'Detaylı transfer bilgileri', inline: false }
            ).setTimestamp()
            .setFooter({ text: 'Sistem Özellikleri' });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    async sendTransferAnnouncement(guild, transferData) {
        console.log('Transfer announcement attempt for type:', transferData.type);
        const announcementChannel = await channels.findAnnouncementChannel(guild);
        console.log('Found announcement channel:', announcementChannel ? announcementChannel.name : 'NOT FOUND');
        if (!announcementChannel) {
            console.log('No announcement channel found - trying to find any text channel...');
            // Last resort - try to find any general channel
            const generalChannel = guild.channels.cache.find(c => 
                c.type === 'GUILD_TEXT' && 
                (c.name.includes('genel') || c.name.includes('general') || c.name.includes('chat'))
            );
            if (generalChannel) {
                console.log('Using general channel:', generalChannel.name);
                // Continue with general channel
            } else {
                console.log('No suitable channel found - skipping announcement');
                return;
            }
        }

        const embedFields = transferData.embed?.fields || [];
        
        let announcementEmbed;
        
        if (transferData.type === 'trade') {
            const { wantedPlayer, givenPlayer, targetPresident, president, tradeData } = transferData;
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('🔄 Takas Gerçekleşti!')
                .setDescription(`**${wantedPlayer.user.username}** <> **${givenPlayer.user.username}**\n\n**Başkanlar takasladi**`)
                .addFields(
                    { name: '📈 İstenen Oyuncu', value: `${wantedPlayer.user}`, inline: true },
                    { name: '📉 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true },
                    { name: '🏟️ Kulüpler', value: `${targetPresident.user.username} ↔ ${president.user.username}`, inline: false }
                );

            // Add salary and contract details if available from tradeData
            if (tradeData) {
                if (tradeData.wantedPlayerSalary && tradeData.wantedPlayerSalary !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '💰 İstenen Oyuncunun Maaşı', value: tradeData.wantedPlayerSalary, inline: true });
                }
                if (tradeData.givenPlayerSalary && tradeData.givenPlayerSalary !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '💸 Verilecek Oyuncunun Maaşı', value: tradeData.givenPlayerSalary, inline: true });
                }
                if (tradeData.additionalAmount && tradeData.additionalAmount !== 'Yok') {
                    announcementEmbed.addFields({ name: '💵 Ek Tazminat', value: tradeData.additionalAmount, inline: true });
                }
                if (tradeData.bonus && tradeData.bonus !== 'Yok') {
                    announcementEmbed.addFields({ name: '🎁 Bonus', value: tradeData.bonus, inline: true });
                }
                if (tradeData.wantedPlayerContract && tradeData.wantedPlayerContract !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '📅 İstenen Oyuncunun Sözleşmesi', value: tradeData.wantedPlayerContract, inline: false });
                }
                if (tradeData.givenPlayerContract && tradeData.givenPlayerContract !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '📋 Verilecek Oyuncunun Sözleşmesi', value: tradeData.givenPlayerContract, inline: false });
                }
            }

            announcementEmbed
                .setThumbnail(wantedPlayer.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Duyuruları' });
        } else if (type === 'offer') {
            // Serbest futbolcu teklif transferi
            const newTeamField = embedFields.find(f => f.name.includes('Yeni Kulüp'));
            const playerNameField = embedFields.find(f => f.name.includes('Oyuncu Adı'));
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Sözleşme Ek Madde'));
            const bonusField = embedFields.find(f => f.name.includes('İmza Bonusu'));
            
            const newTeam = newTeamField ? newTeamField.value : 'Bilinmiyor';
            const playerName = playerNameField ? playerNameField.value : player.displayName;
            const salary = salaryField ? salaryField.value : 'Bilinmiyor';
            const duration = durationField ? durationField.value : 'Bilinmiyor';
            const bonus = bonusField ? bonusField.value : 'Bilinmiyor';
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Teklifi Kabul Edildi!')
                .setDescription(`**${playerName}** teklifi kabul etti ve **${newTeam}** kulübüne transfer oldu!\n\n${player} ➤ ${president}`)
                .addFields(
                    { name: '⚽ Oyuncu', value: playerName, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: newTeam, inline: true },
                    { name: '💰 Maaş', value: salary, inline: true },
                    { name: '📅 Sözleşme Ek Madde', value: duration, inline: true },
                    { name: '🎯 İmza Bonusu', value: bonus, inline: true }
                ).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });
        } else if (type === 'contract') {
            // Contract transfer announcement
            const transferFeeField = embedFields.find(f => f.name.includes('Transfer Bedeli'));
            const oldClubField = embedFields.find(f => f.name.includes('Eski Kulüp'));
            const newClubField = embedFields.find(f => f.name.includes('Yeni Kulüp'));
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Sözleşme'));
            
            const transferFee = transferFeeField ? transferFeeField.value : 'Belirtilmemiş';
            const oldClub = oldClubField ? oldClubField.value : 'Belirtilmemiş';
            const newClub = newClubField ? newClubField.value : 'Belirtilmemiş';
            const salary = salaryField ? salaryField.value : 'Belirtilmemiş';
            const duration = durationField ? durationField.value : 'Belirtilmemiş';
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Sözleşme Transferi Gerçekleşti!')
                .setDescription(`**${player.displayName}** kulüp değiştirdi!\n\n${oldClub} ➤ ${newClub}`)
                .addFields(
                    { name: '⚽ Oyuncu', value: player.displayName, inline: true },
                    { name: '🏆 Eski Kulüp', value: oldClub, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: newClub, inline: true },
                    { name: '💰 Transfer Bedeli', value: transferFee, inline: true },
                    { name: '💸 Yıllık Maaş', value: salary, inline: true },
                    { name: '📅 Sözleşme+Ek Madde', value: duration, inline: true }
                ).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });
        } else {
            // Genel transfer (diğer durumlar)
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Süre'));
            const teamField = embedFields.find(f => f.name.includes('Kulüp') || f.name.includes('Takım'));
            
            const salary = salaryField ? salaryField.value : 'Belirtilmemiş';
            const duration = durationField ? durationField.value : 'Belirtilmemiş';
            const team = teamField ? teamField.value : president.displayName;
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Gerçekleşti!')
                .addFields(
                    { name: '⚽ Oyuncu', value: player.displayName, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: team, inline: true },
                    { name: '💰 Maaş', value: salary, inline: true },
                    { name: '📅 Süre', value: duration, inline: true }
                ).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Duyuruları' });
        }

        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        // Use appropriate ping role based on transfer type
        let pingRoleId = null;
        if (type === 'offer' || type === 'contract' || type === 'trade' || type === 'hire') {
            // Use transferPingRole for general transfers
            pingRoleId = roleData.transferPingRole;
        } else if (type === 'release') {
            // Use freeAgentPingRole for releases
            pingRoleId = roleData.freeAgentPingRole;
        } else {
            // Default to transferPingRole
            pingRoleId = roleData.transferPingRole;
        }
        
        if (pingRoleId) {
            const pingRole = guild.roles.cache.get(pingRoleId);
            if (pingRole) {
                mention = `<@&${pingRoleId}>`;
            }
        }

        const channelToUse = announcementChannel || guild.channels.cache.find(c => 
            c.type === 'GUILD_TEXT' && 
            (c.name.includes('genel') || c.name.includes('general') || c.name.includes('chat'))
        );
        
        if (channelToUse) {
            console.log('Sending announcement to channel:', channelToUse.name);
            const content = mention && mention.trim() !== '' ? mention : '🏈 **Transfer Duyurusu**';
            await channelToUse.send({
                content: content,
                embeds: [announcementEmbed]
            });
            console.log('Announcement sent successfully!');
        } else {
            console.log('No channel available for announcement');
        }
    }

    async sendReleaseTransferAnnouncement(guild, player, releaseData, releaseType) {
        const freeAgentChannel = await channels.findFreeAgentChannel(guild);
        if (!freeAgentChannel) {
            console.log('Serbest duyuru kanalı bulunamadı');
            return;
        }

        const releaseEmbed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.release} Oyuncu Serbest Kaldı`)
            .setDescription(`**${player.username}** serbest futbolcu oldu!`)
            .addFields(
                { name: '🏆 Eski Kulüp', value: releaseData.oldClub || 'Belirtilmemiş', inline: true },
                { name: '📋 Sebep', value: releaseData.reason || 'Belirtilmemiş', inline: false },
                { name: '📅 Tarih', value: new Date().toLocaleDateString('tr-TR'), inline: true }
            )
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        const additionalFields = [];
        if (releaseData.compensation && releaseData.compensation.trim() !== '' && releaseData.compensation !== 'Belirtilmemiş') {
            additionalFields.push({ name: '💰 Tazminat', value: releaseData.compensation, inline: true });
        }
        if (releaseData.newTeam && releaseData.newTeam.trim() !== '' && releaseData.newTeam !== 'Belirtilmemiş') {
            additionalFields.push({ name: '🎯 Yeni Takım', value: releaseData.newTeam, inline: true });
        }
        if (additionalFields.length > 0) {
            releaseEmbed.addFields(additionalFields);
        }

        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        // Only use freeAgentPingRole for free agent announcements
        if (roleData.freeAgentPingRole) {
            const pingRole = guild.roles.cache.get(roleData.freeAgentPingRole);
            if (pingRole) {
                mention = `<@&${roleData.freeAgentPingRole}>`;
            }
        }

        if (mention && mention.trim() !== '') {
            await freeAgentChannel.send({
                content: mention,
                embeds: [releaseEmbed]
            });
        } else {
            await freeAgentChannel.send({
                embeds: [releaseEmbed]
            });
        }
    }

    async handleShowButton(client, interaction, params) {
        const [type, ...additionalParams] = params;
        console.log('HandleShowButton debug:', { type, additionalParams });
        
        switch (type) {
            case 'offer':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowOfferForm(client, interaction, additionalParams.slice(1));
                }
                break;
            case 'contract':
                if (additionalParams[0] === 'modal') {
                    console.log('Contract modal params before passing:', additionalParams.slice(1));
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

    // New methods for in-channel editing without modals
    async showEditableOfferForm(client, interaction, playerId, presidentId) {
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        const editableEmbed = embeds.createOfferForm(president.user, player.user, {
            newTeam: 'Düzenlenecek',
            playerName: player.displayName, 
            salary: 'Düzenlenecek',
            contractDuration: 'Düzenlenecek',
            bonus: 'Düzenlenecek'
        });

        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`show_offer_modal_${playerId}_${presidentId}`)
                    .setLabel('Formu Düzenle')
                    .setStyle('PRIMARY')
                    .setEmoji('✏️'),
                new MessageButton()
                    .setCustomId(`offer_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`offer_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌')
            );

        await interaction.update({
            embeds: [editableEmbed],
            components: [buttons]
        });
    }

    async showEditableContractForm(client, interaction, playerId, presidentId) {
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        const editableEmbed = embeds.createContractForm(president.user, player.user, player.user, {
            newClub: 'Düzenlenecek',
            oldClub: 'Düzenlenecek',
            transferFee: 'Düzenlenecek',
            salary: 'Düzenlenecek',
            contractDuration: 'Düzenlenecek'
        });

        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`show_contract_modal_${playerId}_${presidentId}`)
                    .setLabel('Formu Düzenle')
                    .setStyle('PRIMARY')
                    .setEmoji('✏️'),
                new MessageButton()
                    .setCustomId(`contract_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`contract_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌')
            );

        await interaction.update({
            embeds: [editableEmbed],
            components: [buttons]
        });
    }

    async showEditableTradeForm(client, interaction, playerId, presidentId) {
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        const editableEmbed = embeds.createTradeForm(president.user, player.user, player.user, {
            wantedPlayer: 'Düzenlenecek',
            additionalAmount: 'Düzenlenecek',
            salary: 'Düzenlenecek',
            contractDuration: 'Düzenlenecek'
        });

        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`show_trade_modal_${playerId}_${presidentId}`)
                    .setLabel('Formu Düzenle')
                    .setStyle('PRIMARY')
                    .setEmoji('✏️'),
                new MessageButton()
                    .setCustomId(`trade_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`trade_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌')
            );

        await interaction.update({
            embeds: [editableEmbed],
            components: [buttons]
        });
    }

    async showEditableReleaseForm(client, interaction, playerId, presidentId, releaseType) {
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        const editableEmbed = embeds.createReleaseForm(president.user, player.user, releaseType, {
            oldClub: 'Düzenlenecek',
            reason: 'Düzenlenecek',
            compensation: 'Düzenlenecek',
            newTeam: 'Düzenlenecek'
        });

        const buttons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`show_release_modal_${playerId}_${presidentId}_${releaseType}`)
                    .setLabel('Formu Düzenle')
                    .setStyle('PRIMARY')
                    .setEmoji('✏️'),
                new MessageButton()
                    .setCustomId(`release_accept_${playerId}_${presidentId}_${releaseType}`)
                    .setLabel('Kabul Et')
                    .setStyle('SUCCESS')
                    .setEmoji('✅'),
                new MessageButton()
                    .setCustomId(`release_reject_${playerId}_${presidentId}_${releaseType}`)
                    .setLabel('Reddet')
                    .setStyle('DANGER')
                    .setEmoji('❌')
            );

        await interaction.update({
            embeds: [editableEmbed],
            components: [buttons]
        });
    }

    // Pre-filled edit modal functions
    async showEditOfferModal(client, interaction, playerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            newTeam: fields.find(f => f.name.includes('Yeni Kulüp'))?.value || '',
            playerName: fields.find(f => f.name.includes('Oyuncu Adı'))?.value || '',
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme'))?.value || '',
            bonus: fields.find(f => f.name.includes('Bonus'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`offer_form_${playerId}_${presidentId}`)
            .setTitle('Transfer Teklifi Düzenle');

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.newTeam)
            .setRequired(true);

        const playerNameInput = new TextInputComponent()
            .setCustomId('player_name')
            .setLabel('Oyuncu Adı')
            .setStyle('SHORT')
            .setValue(existingData.playerName)
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setValue(existingData.salary)
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ekmadde')
            .setStyle('SHORT')
            .setValue(existingData.contractDuration)
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('İmza Bonusu')
            .setStyle('SHORT')
            .setValue(existingData.bonus || '')
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(newTeamInput),
            new MessageActionRow().addComponents(playerNameInput),
            new MessageActionRow().addComponents(salaryInput),
            new MessageActionRow().addComponents(contractInput),
            new MessageActionRow().addComponents(bonusInput)
        );

        await interaction.showModal(modal);
    }

    async showEditContractModal(client, interaction, targetPresidentId, playerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            transferFee: fields.find(f => f.name.includes('Transfer'))?.value || '',
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            newClub: fields.find(f => f.name.includes('Yeni Kulüp'))?.value || '',
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`contract_form_${targetPresidentId}_${playerId}_${presidentId}`)
            .setTitle('Sözleşme Düzenle');

        const transferFeeInput = new TextInputComponent()
            .setCustomId('transfer_fee')
            .setLabel('Transfer Ücreti')
            .setStyle('SHORT')
            .setValue(existingData.transferFee)
            .setRequired(true);

        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.oldClub)
            .setRequired(true);

        const newClubInput = new TextInputComponent()
            .setCustomId('new_club')
            .setLabel('Yeni Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.newClub)
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Yıllık Maaş')
            .setStyle('SHORT')
            .setValue(existingData.salary)
            .setRequired(true);

        const contractDurationInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ekmadde')
            .setStyle('SHORT')
            .setValue(existingData.contractDuration)
            .setRequired(true);

        modal.addComponents(
            new MessageActionRow().addComponents(transferFeeInput),
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(newClubInput),
            new MessageActionRow().addComponents(salaryInput),
            new MessageActionRow().addComponents(contractDurationInput)
        );

        await interaction.showModal(modal);
    }

    async showEditTradeModal(client, interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            additionalAmount: fields.find(f => f.name.includes('Ek Miktar'))?.value || '',
            wantedPlayerSalary: fields.find(f => f.name.includes('İstenen Oyuncunun'))?.value || fields.find(f => f.name.includes('Maaş'))?.value || '',
            givenPlayerSalary: fields.find(f => f.name.includes('Verilecek Oyuncunun'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`trade_form_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
            .setTitle('Takas Düzenle');

        const additionalAmountInput = new TextInputComponent()
            .setCustomId('additional_amount')
            .setLabel('Ek Miktar')
            .setStyle('SHORT')
            .setValue(existingData.additionalAmount)
            .setRequired(false);

        const wantedPlayerSalaryInput = new TextInputComponent()
            .setCustomId('wanted_player_salary')
            .setLabel('İstenen Oyuncunun Yeni Maaşı')
            .setStyle('SHORT')
            .setValue(existingData.wantedPlayerSalary)
            .setRequired(true);

        const givenPlayerSalaryInput = new TextInputComponent()
            .setCustomId('given_player_salary')
            .setLabel('Verilecek Oyuncunun Yeni Maaşı')
            .setStyle('SHORT')
            .setValue(existingData.givenPlayerSalary)
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ek Madde')
            .setStyle('SHORT')
            .setValue(existingData.contractDuration)
            .setRequired(true);

        modal.addComponents(
            new MessageActionRow().addComponents(additionalAmountInput),
            new MessageActionRow().addComponents(wantedPlayerSalaryInput),
            new MessageActionRow().addComponents(givenPlayerSalaryInput),
            new MessageActionRow().addComponents(contractInput)
        );

        await interaction.showModal(modal);
    }

    async showEditHireModal(client, interaction, playerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            loanFee: fields.find(f => f.name.includes('Kiralık Bedeli'))?.value || '',
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            loanDuration: fields.find(f => f.name.includes('Kiralık Süresi'))?.value || '',
            optionToBuy: fields.find(f => f.name.includes('Satın Alma'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`hire_form_${playerId}_${presidentId}`)
            .setTitle('Kiralık Düzenle');

        const loanFeeInput = new TextInputComponent()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle('SHORT')
            .setValue(existingData.loanFee)
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setValue(existingData.salary)
            .setRequired(true);

        const loanDurationInput = new TextInputComponent()
            .setCustomId('loan_duration')
            .setLabel('Kiralık Süresi')
            .setStyle('SHORT')
            .setValue(existingData.loanDuration)
            .setRequired(true);

        const optionToBuyInput = new TextInputComponent()
            .setCustomId('option_to_buy')
            .setLabel('Satın Alma Opsiyonu')
            .setStyle('SHORT')
            .setValue(existingData.optionToBuy || '')
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(loanFeeInput),
            new MessageActionRow().addComponents(salaryInput),
            new MessageActionRow().addComponents(loanDurationInput),
            new MessageActionRow().addComponents(optionToBuyInput)
        );

        await interaction.showModal(modal);
    }

    async showEditReleaseModal(client, interaction, playerId, presidentId, releaseType) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            reason: fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
            compensation: fields.find(f => f.name.includes('Tazminat'))?.value || '',
            newTeam: fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`release_form_${playerId}_${presidentId}_${releaseType}`)
            .setTitle('Fesih Düzenle');

        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.oldClub)
            .setRequired(true);

        const reasonInput = new TextInputComponent()
            .setCustomId('reason')
            .setLabel('Fesih Nedeni')
            .setStyle('PARAGRAPH')
            .setValue(existingData.reason)
            .setRequired(true);

        const compensationInput = new TextInputComponent()
            .setCustomId('compensation')
            .setLabel('Tazminat')
            .setStyle('SHORT')
            .setValue(existingData.compensation || '')
            .setRequired(false);

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Takım')
            .setStyle('SHORT')
            .setValue(existingData.newTeam || '')
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(reasonInput),
            new MessageActionRow().addComponents(compensationInput),
            new MessageActionRow().addComponents(newTeamInput)
        );

        await interaction.showModal(modal);
    }

    async handleShowOfferForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        
        const modal = new Modal()
            .setCustomId(`offer_form_${playerId}_${presidentId}`)
            .setTitle('Transfer Teklifi Formu');

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Kulüp')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Galatasaray')
            .setRequired(true);

        const playerNameInput = new TextInputComponent()
            .setCustomId('player_name')
            .setLabel('Oyuncu Adı')
            .setStyle('SHORT')
            .setPlaceholder(`${player.displayName}`)
            .setValue(`${player.displayName}`)
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 6.000.000₺/yıl')
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ekmadde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl + bonuslar')
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('İmza Bonusu')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 3.000.000₺')
            .setRequired(false);

        const row1 = new MessageActionRow().addComponents(newTeamInput);
        const row2 = new MessageActionRow().addComponents(playerNameInput);
        const row3 = new MessageActionRow().addComponents(salaryInput);
        const row4 = new MessageActionRow().addComponents(contractInput);
        const row5 = new MessageActionRow().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    }

    async handleShowContractForm(client, interaction, params) {
        console.log('HandleShowContractForm received params:', params);
        const [targetPresidentId, playerId, presidentId] = params;
        console.log('Parsed contract params:', { targetPresidentId, playerId, presidentId });
        
        const modal = new Modal()
            .setCustomId(`contract_form_${targetPresidentId}_${playerId}_${presidentId}`)
            .setTitle('Sözleşme Teklifi Formu');

        const transferFeeInput = new TextInputComponent()
            .setCustomId('transfer_fee')
            .setLabel('Transfer Bedeli')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 15.000.000₺')
            .setRequired(true);

        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Fenerbahçe')
            .setRequired(true);

        const newClubInput = new TextInputComponent()
            .setCustomId('new_club')
            .setLabel('Yeni Kulüp')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Galatasaray')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 8.000.000₺/yıl')
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ek Madde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 3 yıl + bonuslar')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(transferFeeInput);
        const row2 = new MessageActionRow().addComponents(oldClubInput);
        const row3 = new MessageActionRow().addComponents(newClubInput);
        const row4 = new MessageActionRow().addComponents(salaryInput);
        const row5 = new MessageActionRow().addComponents(contractInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    }

    async handleShowTradeForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`trade_form_${playerId}_${presidentId}`)
            .setTitle('Takas Teklifi Formu');

        const additionalAmountInput = new TextInputComponent()
            .setCustomId('additional_amount')
            .setLabel('Ek Miktar')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 5.000.000₺')
            .setRequired(false);

        const wantedPlayerInput = new TextInputComponent()
            .setCustomId('wanted_player')
            .setLabel('İstenen Oyuncu')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Cristiano Ronaldo')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 10.000.000₺/yıl')
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ekmadde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(additionalAmountInput);
        const row2 = new MessageActionRow().addComponents(wantedPlayerInput);
        const row3 = new MessageActionRow().addComponents(salaryInput);
        const row4 = new MessageActionRow().addComponents(contractInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    }

    async handleShowHireForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`hire_form_${playerId}_${presidentId}`)
            .setTitle('Kiralık Sözleşme Formu');

        const loanFeeInput = new TextInputComponent()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2.000.000₺')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 4.000.000₺/yıl')
            .setRequired(true);

        const loanDurationInput = new TextInputComponent()
            .setCustomId('loan_duration')
            .setLabel('Kiralık Süresi')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 1 yıl')
            .setRequired(true);

        const optionToBuyInput = new TextInputComponent()
            .setCustomId('option_to_buy')
            .setLabel('Satın Alma Opsiyonu')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 12.000.000₺')
            .setRequired(false);

        const row1 = new MessageActionRow().addComponents(loanFeeInput);
        const row2 = new MessageActionRow().addComponents(salaryInput);
        const row3 = new MessageActionRow().addComponents(loanDurationInput);
        const row4 = new MessageActionRow().addComponents(optionToBuyInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    }



    async handleShowTradeForm(client, interaction, params) {
        const [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`trade_form_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
            .setTitle('Takas Teklifi Formu');

        const additionalAmountInput = new TextInputComponent()
            .setCustomId('additional_amount')
            .setLabel('Ek Miktar')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 5.000.000₺')
            .setRequired(false);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonus')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2.000.000₺')
            .setRequired(false);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ek Madde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl + performans bonusu')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(additionalAmountInput);
        const row2 = new MessageActionRow().addComponents(bonusInput);
        const row3 = new MessageActionRow().addComponents(contractInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    }

    // Oyuncular anlaştığında açılacak maaş düzenleme modalı
    async handleShowTradePlayerSalaryForm(client, interaction, params) {
        const [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        // Store params in global for modal submission handler
        const channelId = interaction.channel.id;
        global[`trade_params_${channelId}`] = { targetPresidentId, wantedPlayerId, givenPlayerId, presidentId };
        
        const modal = new Modal()
            .setCustomId(`trade_edit_${channelId}`)
            .setTitle('Oyuncu Maaşları Düzenleme');

        const wantedPlayerSalaryInput = new TextInputComponent()
            .setCustomId('wanted_player_salary')
            .setLabel('İstenen Oyuncunun Maaşı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 15.000.000₺/yıl')
            .setRequired(true);

        const givenPlayerSalaryInput = new TextInputComponent()
            .setCustomId('given_player_salary')
            .setLabel('Verilecek Oyuncunun Maaşı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 10.000.000₺/yıl')
            .setRequired(true);

        const wantedPlayerContractInput = new TextInputComponent()
            .setCustomId('wanted_player_contract')
            .setLabel('İstenen Oyuncunun Sözleşme/Ek Madde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 3 yıl + performans bonusu')
            .setRequired(true);

        const givenPlayerContractInput = new TextInputComponent()
            .setCustomId('given_player_contract')
            .setLabel('Verilecek Oyuncunun Sözleşme/Ek Madde')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl + imza bonusu')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(wantedPlayerSalaryInput);
        const row2 = new MessageActionRow().addComponents(givenPlayerSalaryInput);
        const row3 = new MessageActionRow().addComponents(wantedPlayerContractInput);
        const row4 = new MessageActionRow().addComponents(givenPlayerContractInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
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
        const [userId] = params;
        
        const modal = new Modal()
            .setCustomId(`announcement_form_${userId}`)
            .setTitle('Manuel Duyuru Formu');

        const desireInput = new TextInputComponent()
            .setCustomId('desire')
            .setLabel('Ne İsterim')
            .setStyle('PARAGRAPH')
            .setPlaceholder('Örn: Yeni takım arıyorum, sözleşme yenilemek istiyorum, vs.')
            .setRequired(true);

        const roleInput = new TextInputComponent()
            .setCustomId('team_role')
            .setLabel('Takımdaki Rolüm')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Orta saha, Kaleci, Forvet, vs.')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş Beklentim')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 5.000.000₺/yıl')
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract')
            .setLabel('Sözleşme Tercihi')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl, uzun vadeli, vs.')
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonus Beklentileri')
            .setStyle('SHORT')
            .setPlaceholder('Örn: İmza bonusu, performans bonusu, vs.')
            .setRequired(false);

        const row1 = new MessageActionRow().addComponents(desireInput);
        const row2 = new MessageActionRow().addComponents(roleInput);
        const row3 = new MessageActionRow().addComponents(salaryInput);
        const row4 = new MessageActionRow().addComponents(contractInput);
        const row5 = new MessageActionRow().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
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

        const row1 = new MessageActionRow().addComponents(oldClubInput);
        const row2 = new MessageActionRow().addComponents(reasonInput);
        const row3 = new MessageActionRow().addComponents(compensationInput);
        const row4 = new MessageActionRow().addComponents(newTeamInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    }
}

module.exports = ButtonHandler;