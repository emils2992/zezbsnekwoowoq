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
                case 'brelease':
                    await this.handleBreleaseButton(client, interaction, params);
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
            // permissions already imported at top
            try {
                // Remove free agent role
                await permissions.signPlayer(player);
                console.log(`Removed free agent role and added player role for ${player.displayName}`);
            } catch (error) {
                console.error('Role management error:', error);
            }

            await interaction.deferReply();
            
            if (!interaction.replied) {
                await interaction.editReply({
                    content: `✅ Transfer kabul edildi!`
                });
            }

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
            // Defer immediately to prevent timeout
            await interaction.deferReply();
            
            // Check if user is authorized (target president only)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.editReply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri takas teklifini kabul edebilir!'
                });
            }
            
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

            try {
                await interaction.editReply({
                    content: `✅ Takas başkanlar tarafından kabul edildi! Oyuncuların onayı için ${playersChannel} kanalı oluşturuldu.\n\n${wantedPlayer.user} ${givenPlayer.user} ${targetPresident.user} ${president.user} - Lütfen ${playersChannel} kanalına gidin ve takası onaylayın.`
                });
                console.log('✅ Trade accept response sent successfully');
            } catch (error) {
                console.error('❌ Trade accept response error:', error);
            }

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
            // Defer immediately to prevent timeout
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }
            
            // Check if user is authorized (target president only)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.editReply({
                    content: '❌ Sadece hedef başkan veya transfer yetkilileri takas teklifini reddedebilir!'
                });
            }
            
            await interaction.editReply({
                content: `❌ Takas teklifi reddedildi!`
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
                        await channelToDelete.delete("Takas reddedildi - Kanal otomatik silindi");
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

            // Show modal directly (modals handle their own response)
            try {
                await this.showEditTradeModal(client, interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
            } catch (error) {
                console.error('Modal show error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Form açılırken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            }
        }
    }

    async handleTradePlayerButton(client, interaction, params) {
        const [buttonType, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        console.log('Trade player button clicked:', { buttonType: buttonType, params: params, userId: interaction.user.id });
        const guild = interaction.guild;
        const targetPresident = await guild.members.fetch(targetPresidentId);
        const wantedPlayer = await guild.members.fetch(wantedPlayerId);
        const givenPlayer = await guild.members.fetch(givenPlayerId);
        const president = await guild.members.fetch(presidentId);
        
        console.log(`Trade button debug: User ${interaction.user.id} clicked ${buttonType}, WantedPlayer: ${wantedPlayerId}, GivenPlayer: ${givenPlayerId}`);

        if (buttonType === 'accept') {
            console.log('🎯 Trade player accept button clicked - starting processing...');
            
            // Defer immediately to prevent timeout
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
                console.log('✅ Interaction deferred successfully');
            }
            
            // Check if user is one of the players or transfer authority
            const member = interaction.member;
            const isAuthorizedPlayer = interaction.user.id === wantedPlayerId || interaction.user.id === givenPlayerId;
            const isTransferAuthority = permissions.isTransferAuthority(member);
            
            console.log(`🔍 Authorization check: isPlayer=${isAuthorizedPlayer}, isAuthority=${isTransferAuthority}`);
            
            if (!isAuthorizedPlayer && !isTransferAuthority) {
                console.log('❌ User not authorized - sending error response');
                await interaction.editReply({
                    content: '❌ Sadece takas edilen oyuncular veya transfer yetkilileri onaylayabilir!'
                });
                console.log('✅ Error response sent successfully');
                return;
            }

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
            
            // Mark this player as accepted - use string comparison for safety
            const userId = interaction.user.id.toString();
            const wantedId = wantedPlayerId.toString();
            const givenId = givenPlayerId.toString();
            
            console.log(`Trade acceptance check: User ${userId} vs Wanted ${wantedId} vs Given ${givenId}`);
            console.log(`Transfer authority check: ${isTransferAuthority}`);
            console.log(`Current acceptance state:`, global[acceptanceKey]);
            
            // Check for duplicate acceptances first
            if (!isTransferAuthority) {
                if ((interaction.user.id === wantedPlayerId && global[acceptanceKey].wantedPlayer) ||
                    (interaction.user.id === givenPlayerId && global[acceptanceKey].givenPlayer)) {
                    console.log('❌ Duplicate acceptance attempt by regular player');
                    try {
                        await interaction.editReply({
                            content: `⚠️ Sen zaten takası kabul ettin! Diğer oyuncunun kararı bekleniyor...`
                        });
                        console.log('✅ Duplicate warning sent');
                    } catch (error) {
                        console.error('❌ Duplicate warning failed:', error.message);
                    }
                    return;
                }
            }
            
            // Handle authority and player acceptances
            console.log('🔄 Processing acceptance...');
            if (isTransferAuthority) {
                console.log('🛡️ Processing authority acceptance...');
                
                // If both already accepted, don't allow more clicks
                if (global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                    console.log('❌ Both already accepted by authority');
                    try {
                        await interaction.editReply({
                            content: `✅ Her iki oyuncu da zaten kabul etti! Duyuru gönderiliyor...`
                        });
                        console.log('✅ Both accepted warning sent');
                    } catch (error) {
                        console.error('❌ Both accepted warning failed:', error.message);
                    }
                    return;
                }
                
                // Accept for whichever player hasn't been accepted yet  
                if (!global[acceptanceKey].wantedPlayer) {
                    console.log('⭐ Authority accepting for wanted player...');
                    global[acceptanceKey].wantedPlayer = true;
                    console.log(`✅ Wanted player accepted by authority ${interaction.user.username}! Status:`, global[acceptanceKey]);
                    
                    // Send response without throwing on error
                    try {
                        await interaction.editReply({
                            content: `✅ **${wantedPlayer.displayName} (Yetkili tarafından onaylandı)** takası kabul etti! ${global[acceptanceKey].givenPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
                        });
                        console.log('✅ Authority response sent for wanted player - SUCCESS');
                    } catch (error) {
                        console.error('❌ Authority response FAILED (non-blocking):', error.message);
                        // Continue execution regardless of response error
                    }
                    console.log('✅ Authority wanted player acceptance completed');
                    
                    // Force completion check after authority acceptance
                    if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                        console.log('🎯 DUAL ACCEPTANCE DETECTED - Starting completion process...');
                        await this.completeTradeTransfer(interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
                        return;
                    }
                } else if (!global[acceptanceKey].givenPlayer) {
                    console.log('⭐ Authority accepting for given player...');
                    global[acceptanceKey].givenPlayer = true;
                    console.log(`✅ Given player accepted by authority ${interaction.user.username}! Status:`, global[acceptanceKey]);
                    
                    // Send response without throwing on error
                    try {
                        await interaction.editReply({
                            content: `✅ **${givenPlayer.displayName} (Yetkili tarafından onaylandı)** takası kabul etti! Her iki oyuncu da kabul etti!`
                        });
                        console.log('✅ Authority response sent for given player - SUCCESS');
                    } catch (error) {
                        console.error('❌ Authority response FAILED (non-blocking):', error.message);
                        // Continue execution regardless of response error
                    }
                    console.log('✅ Authority given player acceptance completed');
                    
                    // Force completion check after authority acceptance
                    if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                        console.log('🎯 DUAL ACCEPTANCE DETECTED - Starting completion process...');
                        await this.completeTradeTransfer(interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
                        return;
                    }
                } else {
                    console.log('❌ Authority trying to accept but both already accepted');
                    try {
                        await interaction.editReply({
                            content: `❌ Her iki oyuncu da zaten kabul etti!`
                        });
                        console.log('✅ Authority duplicate response sent - SUCCESS');
                    } catch (error) {
                        console.error('❌ Authority duplicate response FAILED (non-blocking):', error.message);
                    }
                    return;
                }
            } else if (userId === wantedId) {
                console.log('⭐ Regular wanted player accepting...');
                global[acceptanceKey].wantedPlayer = true;
                console.log(`✅ Wanted player ${wantedPlayer.displayName} accepted! Status:`, global[acceptanceKey]);
                
                // Send response without throwing on error
                try {
                    await interaction.editReply({
                        content: `✅ **${wantedPlayer.displayName}** takası kabul etti! ${global[acceptanceKey].givenPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
                    });
                    console.log('✅ Wanted player response sent - SUCCESS');
                } catch (error) {
                    console.error('❌ Wanted player response FAILED (non-blocking):', error.message);
                }
                console.log('✅ Regular wanted player acceptance completed');
                
                // Check for completion after regular player acceptance
                if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                    console.log('🎯 DUAL ACCEPTANCE DETECTED - Starting completion process...');
                    await this.completeTradeTransfer(interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
                    return;
                }
            } else if (userId === givenId) {
                console.log('⭐ Regular given player accepting...');
                global[acceptanceKey].givenPlayer = true;
                console.log(`✅ Given player ${givenPlayer.displayName} accepted! Status:`, global[acceptanceKey]);
                
                // Send response without throwing on error
                try {
                    await interaction.editReply({
                        content: `✅ **${givenPlayer.displayName}** takası kabul etti! ${global[acceptanceKey].wantedPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
                    });
                    console.log('✅ Given player response sent - SUCCESS');
                } catch (error) {
                    console.error('❌ Given player response FAILED (non-blocking):', error.message);
                }
                console.log('✅ Regular given player acceptance completed');
                
                // Check for completion after regular player acceptance
                if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                    console.log('🎯 DUAL ACCEPTANCE DETECTED - Starting completion process...');
                    await this.completeTradeTransfer(interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
                    return;
                }
            } else {
                console.log(`❌ Unauthorized user ${userId} (wanted: ${wantedId}, given: ${givenId})`);
                console.log('🚫 Sending unauthorized response...');
                
                // Send error response without throwing on error
                try {
                    await interaction.editReply({
                        content: `❌ Sadece takas edilen oyuncular veya transfer yetkilileri kabul edebilir!`
                    });
                    console.log('✅ Unauthorized response sent - SUCCESS');
                } catch (error) {
                    console.error('❌ Unauthorized response FAILED (non-blocking):', error.message);
                }
                console.log('🔚 Ending unauthorized interaction');
                return;
            }
            
            console.log('✅ Acceptance processing completed, proceeding to dual check...');

            // CRITICAL: Check if both players have accepted immediately after marking acceptance
            console.log(`🔍 CHECKING DUAL ACCEPTANCE for channel ${channelName}:`, global[acceptanceKey]);
            console.log(`🔍 Has wanted player: ${global[acceptanceKey].wantedPlayer}`);
            console.log(`🔍 Has given player: ${global[acceptanceKey].givenPlayer}`);
            console.log(`🔍 Condition check: both exist? ${global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer}`);
            
            if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer === true && global[acceptanceKey].givenPlayer === true) {
                console.log('🎉🎉🎉 BOTH PLAYERS ACCEPTED! Starting completion process...');
                console.log('🚀 EXECUTION POINT REACHED - FORCING COMPLETION NOW!');
                
                try {
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

                    console.log('📊 Trade data extracted:', tradeData);

                    console.log('📢 Sending transfer announcement...');
                    try {
                        await this.sendTransferAnnouncement(guild, {
                            type: 'trade',
                            wantedPlayer: wantedPlayer,
                            givenPlayer: givenPlayer,
                            targetPresident: targetPresident,
                            president: president,
                            embed: interaction.message.embeds[0],
                            tradeData: tradeData
                        });
                        console.log('✅ Transfer announcement sent successfully!');
                    } catch (announcementError) {
                        console.error('❌ Error sending announcement:', announcementError);
                        // Continue with channel deletion even if announcement fails
                    }

                    // Send completion message to channel - use channel.send instead of interaction reply
                    console.log('📨 Sending completion message...');
                    try {
                        await interaction.channel.send({
                            content: `🎉 **HER İKİ OYUNCU DA KABUL ETTİ!** Takas tamamlandı ve otomatik duyuru gönderildi!\n\n${targetPresident.user} ${president.user}\n\n⏰ Kanal 3 saniye sonra otomatik olarak silinecek...`
                        });
                        console.log('✅ Completion message sent!');
                    } catch (msgError) {
                        console.error('❌ Error sending completion message:', msgError);
                        // Continue with the process even if message fails
                    }

                    // Disable all buttons
                    console.log('🔒 Disabling all buttons...');
                    try {
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
                        console.log('✅ Buttons disabled!');
                    } catch (buttonError) {
                        console.error('❌ Error disabling buttons:', buttonError);
                        // Continue with the process even if button disabling fails
                    }

                    // Clean up acceptances FIRST to prevent re-execution
                    delete global[acceptanceKey];
                    console.log('🧹 Acceptance tracking cleaned up FIRST');

                    // Delete channel after delay with countdown
                    console.log('⏰ Starting channel deletion countdown...');
                    setTimeout(async () => {
                        try {
                            await interaction.channel.send('⏰ **2 saniye sonra kanal silinecek...**');
                        } catch (error) {
                            console.log('Countdown message error:', error);
                        }
                    }, 1000);
                    
                    setTimeout(async () => {
                        try {
                            await interaction.channel.send('⏰ **1 saniye sonra kanal silinecek...**');
                        } catch (error) {
                            console.log('Countdown message error:', error);
                        }
                    }, 2000);
                    
                    setTimeout(async () => {
                        try {
                            const channelToDelete = interaction.channel;
                            if (channelToDelete && channelToDelete.deletable) {
                                console.log(`🗑️ TRADE COMPLETED - DELETING CHANNEL: ${channelToDelete.name}`);
                                await channelToDelete.delete("✅ Takas başarıyla tamamlandı - Kanal otomatik silindi");
                                console.log('✅ TRADE CHANNEL SUCCESSFULLY DELETED');
                            } else {
                                console.log('❌ Channel not deletable or not found');
                            }
                        } catch (error) {
                            console.error('❌ CHANNEL DELETION ERROR:', error);
                        }
                    }, 3000);
                    
                } catch (error) {
                    console.error('❌ ERROR in trade completion process:', error);
                    try {
                        await interaction.channel.send({
                            content: `❌ Takas tamamlanırken bir hata oluştu ama kanal silinecek: ${error.message}`
                        });
                    } catch (fallbackError) {
                        console.error('❌ Even fallback message failed:', fallbackError);
                    }
                    
                    // Force channel deletion even on error
                    console.log('🔥 FORCING CHANNEL DELETION DUE TO ERROR...');
                    setTimeout(async () => {
                        try {
                            const channelToDelete = interaction.channel;
                            if (channelToDelete && channelToDelete.deletable) {
                                console.log(`🗑️ FORCING DELETION: ${channelToDelete.name}`);
                                await channelToDelete.delete("Hata nedeniyle zorla silindi");
                                console.log('✅ CHANNEL FORCE DELETED');
                            }
                        } catch (deleteError) {
                            console.error('❌ FORCE DELETE FAILED:', deleteError);
                        }
                    }, 2000);
                    
                    // Clean up acceptances
                    delete global[acceptanceKey];
                    console.log('🧹 Acceptance tracking cleaned up after error');
                }
            } else {
                console.log('❌ NOT BOTH ACCEPTED YET - Waiting for more acceptances...');
                console.log(`Current state: wanted=${global[acceptanceKey].wantedPlayer}, given=${global[acceptanceKey].givenPlayer}`);
                
                // FORCE CHECK: If both are actually true but condition failed
                if (global[acceptanceKey] && global[acceptanceKey].wantedPlayer && global[acceptanceKey].givenPlayer) {
                    console.log('🔥 FORCING COMPLETION - Both are true but condition check failed!');
                    console.log('Values:', global[acceptanceKey]);
                    
                    // Force execution by setting a timeout
                    setTimeout(async () => {
                        console.log('⚡ TIMEOUT FORCING TRADE COMPLETION...');
                        try {
                            await interaction.channel.send({
                                content: `🎉 **TAKAS TAMAMLANDI!** Her iki oyuncu da kabul etti! Kanal 2 saniye sonra silinecek.`
                            });
                            
                            setTimeout(async () => {
                                try {
                                    const channelToDelete = interaction.channel;
                                    if (channelToDelete && channelToDelete.deletable) {
                                        await channelToDelete.delete("Takas tamamlandı - Zorla silindi");
                                        console.log('✅ FORCE COMPLETED TRADE');
                                    }
                                } catch (error) {
                                    console.error('Force completion error:', error);
                                }
                            }, 2000);
                            
                            delete global[acceptanceKey];
                        } catch (error) {
                            console.error('Force completion error:', error);
                        }
                    }, 1000);
                }
            }

        } else if (buttonType === 'reject') {
            // Defer immediately to prevent timeout
            await interaction.deferReply();
            
            // Check if user is one of the players
            const member = interaction.member;
            const isAuthorizedPlayer = interaction.user.id === wantedPlayerId || interaction.user.id === givenPlayerId;
            const isTransferAuthority = permissions.isTransferAuthority(member);
            
            if (!isAuthorizedPlayer && !isTransferAuthority) {
                return interaction.editReply({
                    content: '❌ Sadece takas edilen oyuncular veya transfer yetkilileri reddedebilir!'
                });
            }

            const playerName = interaction.user.id === wantedPlayerId ? wantedPlayer.displayName : givenPlayer.displayName;
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

            // Show salary editing modal for both players - modals handle their own response
            try {
                await this.handleShowTradePlayerSalaryForm(client, interaction, [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId]);
            } catch (error) {
                console.error('Modal show error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Form açılırken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            }
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

            // Role management for trelease - convert player to free agent
            if (releaseType === 'unilateral') {
                try {
                    await permissions.makePlayerFree(player);
                    console.log(`Converted ${player.displayName} to free agent via trelease`);
                } catch (error) {
                    console.error('Role management error in trelease:', error);
                }
            }

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

            // Role management for release - convert player to free agent
            try {
                await permissions.makePlayerFree(player);
                console.log(`Converted ${player.displayName} to free agent via release`);
            } catch (error) {
                console.error('Role management error in release:', error);
            }
            
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
        const [buttonType, targetPresidentId, playerId, presidentId] = params;
        const guild = interaction.guild;
        const targetPresident = await guild.members.fetch(targetPresidentId);
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Check if user is authorized (target president or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
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
                targetPresident: targetPresident,
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
        console.log('🚀 STARTING sendTransferAnnouncement for type:', transferData.type);
        console.log('📊 Transfer data received:', {
            type: transferData.type,
            hasWantedPlayer: !!transferData.wantedPlayer,
            hasGivenPlayer: !!transferData.givenPlayer,
            hasTradeData: !!transferData.tradeData
        });
        
        const announcementChannel = await channels.findAnnouncementChannel(guild);
        console.log('📍 Found announcement channel:', announcementChannel ? announcementChannel.name : 'NOT FOUND');
        
        if (!announcementChannel) {
            console.log('⚠️ No announcement channel found - trying to find any text channel...');
            // Last resort - try to find any general channel
            const generalChannel = guild.channels.cache.find(c => 
                c.type === 'GUILD_TEXT' && 
                (c.name.includes('genel') || c.name.includes('general') || c.name.includes('chat'))
            );
            if (generalChannel) {
                console.log('✅ Using general channel:', generalChannel.name);
                // Continue with general channel
            } else {
                console.log('❌ No suitable channel found - skipping announcement');
                return;
            }
        }

        const embedFields = transferData.embed?.fields || [];
        
        let announcementEmbed;
        
        if (transferData.type === 'trade') {
            const { wantedPlayer, givenPlayer, targetPresident, president, tradeData } = transferData;
            
            // Create a composite image URL with both player avatars side by side
            const wantedPlayerAvatar = wantedPlayer.user.displayAvatarURL({ format: 'png', size: 256 });
            const givenPlayerAvatar = givenPlayer.user.displayAvatarURL({ format: 'png', size: 256 });
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('🔄 Takas Gerçekleşti!')
                .setDescription(`**${wantedPlayer.user.username}** ↔ **${givenPlayer.user.username}**`)
                .addFields(
                    { name: '📈 İstenen Oyuncu', value: `${wantedPlayer.user}`, inline: true },
                    { name: '📉 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true },
                    { name: '🏟️ Kulüpler', value: `${targetPresident.displayName}'nin takımı ↔ ${president.displayName}'nin takımı`, inline: false }
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
                .setImage(wantedPlayerAvatar) // Main image shows wanted player
                .setThumbnail(givenPlayerAvatar) // Thumbnail shows given player
                .setTimestamp()
                .setFooter({ text: 'Transfer Duyuruları' });
        } else if (transferData.type === 'offer') {
            // Serbest futbolcu teklif transferi
            const { player, president } = transferData;
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
        } else if (transferData.type === 'contract') {
            // Contract transfer announcement
            const { player, president } = transferData;
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
            const { player, president } = transferData;
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
        if (transferData.type === 'offer' || transferData.type === 'contract' || transferData.type === 'trade' || transferData.type === 'hire') {
            // Use tfPingRole for transfer announcements
            pingRoleId = roleData.tfPingRole;
        } else if (transferData.type === 'release') {
            // Use serbestPingRole for releases
            pingRoleId = roleData.serbestPingRole;
        } else {
            // Default to tfPingRole
            pingRoleId = roleData.tfPingRole;
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
            console.log('📤 Sending announcement to channel:', channelToUse.name);
            const content = mention && mention.trim() !== '' ? mention : '🏈 **Transfer Duyurusu**';
            try {
                await channelToUse.send({
                    content: content,
                    embeds: [announcementEmbed]
                });
                console.log('✅ Announcement sent successfully to', channelToUse.name);
            } catch (error) {
                console.error('❌ Error sending announcement:', error);
                throw error;
            }
        } else {
            console.log('❌ No channel available for announcement');
            throw new Error('No announcement channel found');
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
        console.log('HandleShowButton debug:', { type, additionalParams, userId: interaction.user.id });
        
        // Authorization check - only command creator can use their button
        // For release: [modal, playerId, presidentId, releaseType] - presidentId is at index 2
        // For others: [modal, targetId, presidentId] - presidentId is at index 2
        let commandCreatorId;
        if (type === 'announcement') {
            // For announcement: [modal, userId] - userId is at index 1
            commandCreatorId = additionalParams[1];
        } else if (type === 'release') {
            // For release: [modal, playerId, presidentId, releaseType] - presidentId is at index 2
            commandCreatorId = additionalParams[2];
        } else {
            // For offer, contract, trade, hire: [modal, targetId, presidentId] - presidentId is at index 2
            commandCreatorId = additionalParams[2];
        }
        
        console.log('Authorization check:', { commandCreatorId, userId: interaction.user.id });
        
        if (interaction.user.id !== commandCreatorId) {
            return interaction.reply({
                content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                ephemeral: true
            });
        }
        
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
            case 'brelease':
                if (additionalParams[0] === 'modal') {
                    await this.handleShowBreleaseForm(client, interaction, additionalParams.slice(1));
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
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            newTeam: fields.find(f => f.name.includes('Yeni Kulüp'))?.value || '',
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme+Ek Madde'))?.value || '',
            bonus: fields.find(f => f.name.includes('Bonus'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`offer_form_${playerId}_${presidentId}`)
            .setTitle('Transfer Teklifi Düzenle');

        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.oldClub)
            .setRequired(true);

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Kulüp')
            .setStyle('SHORT')
            .setValue(existingData.newTeam)
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setValue(existingData.salary)
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ek Madde')
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
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(newTeamInput),
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

    async showEditHireModal(client, interaction, targetPresidentId, playerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields
        const existingData = {
            loanFee: fields.find(f => f.name.includes('Kiralık Bedeli'))?.value || '',
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            newClub: fields.find(f => f.name.includes('Yeni Kulüp'))?.value || '',
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`hire_form_${targetPresidentId}_${playerId}_${presidentId}`)
            .setTitle('Kiralık Düzenle');

        const loanFeeInput = new TextInputComponent()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle('SHORT')
            .setValue(existingData.loanFee)
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
        const [targetPresidentId, playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`hire_form_${targetPresidentId}_${playerId}_${presidentId}`)
            .setTitle('Kiralık Teklifi Formu');

        const loanFeeInput = new TextInputComponent()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2.000.000₺')
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
            .setPlaceholder('Örn: 1 yıl + opsiyon')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(loanFeeInput);
        const row2 = new MessageActionRow().addComponents(oldClubInput);
        const row3 = new MessageActionRow().addComponents(newClubInput);
        const row4 = new MessageActionRow().addComponents(salaryInput);
        const row5 = new MessageActionRow().addComponents(contractInput);

        modal.addComponents(row1, row2, row3, row4, row5);

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
            .setLabel('İstenen Oyuncu Özellikleri')
            .setStyle('SHORT')
            .setPlaceholder('Örn: Mevki, yaş, özellikler')
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
    async completeTradeTransfer(interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId) {
        console.log('🎯 STARTING TRADE COMPLETION PROCESS...');
        
        try {
            const guild = interaction.guild;
            const targetPresident = await guild.members.fetch(targetPresidentId);
            const wantedPlayer = await guild.members.fetch(wantedPlayerId);
            const givenPlayer = await guild.members.fetch(givenPlayerId);
            const president = await guild.members.fetch(presidentId);

            console.log('✅ All users fetched for trade completion');

            // Send transfer announcement
            await this.sendTradeTransferAnnouncement(guild, {
                targetPresident,
                wantedPlayer,
                givenPlayer,
                president
            });

            console.log('✅ Trade announcement sent');

            // Send completion response
            try {
                await interaction.editReply({
                    content: `🎉 **TAKAS TAMAMLANDI!** ${wantedPlayer.displayName} ↔ ${givenPlayer.displayName}\n\nTransfer duyurusu yapıldı. Kanal 3 saniye içinde silinecek.`
                });
                console.log('✅ Trade completion response sent');
            } catch (replyError) {
                console.error('❌ Trade completion response error:', replyError);
            }

            // Disable buttons
            try {
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
                console.log('✅ Buttons disabled');
            } catch (buttonError) {
                console.error('❌ Button disable error:', buttonError);
            }

            // Delete channel after delay
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`🗑️ Deleting trade completion channel: ${channelToDelete.name}`);
                        await channelToDelete.delete("Takas tamamlandı");
                        console.log('✅ Trade channel deleted successfully');
                    }
                } catch (deleteError) {
                    console.error('❌ Channel deletion error:', deleteError);
                }
            }, 3000);

            // Cleanup acceptance tracking
            const channelName = interaction.channel.name;
            const acceptanceKey = `trade_acceptances_${channelName}`;
            delete global[acceptanceKey];
            console.log('✅ Trade completion process finished');

        } catch (error) {
            console.error('❌ Trade completion process error:', error);
        }
    }

    async sendTradeTransferAnnouncement(guild, transferData) {
        console.log('📢 Sending trade transfer announcement...');
        
        try {
            const announcementChannel = await channels.findAnnouncementChannel(guild);
            
            if (!announcementChannel) {
                console.log('❌ No announcement channel found');
                return;
            }

            const { targetPresident, wantedPlayer, givenPlayer, president } = transferData;

            const embed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.trade} Takas Tamamlandı`)
                .setDescription(`**${wantedPlayer.displayName}** ↔ **${givenPlayer.displayName}**`)
                .addFields(
                    { name: '🏟️ Kulüpler', value: `${targetPresident.displayName}'nin takımı ↔ ${president.displayName}'nin takımı`, inline: false },
                    { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                )
                .setImage(wantedPlayer.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setThumbnail(givenPlayer.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Get ping roles
            const roleData = permissions.getRoleData(guild.id);
            let mentionText = '';

            if (roleData && roleData.transferPingRole) {
                const transferPingRole = guild.roles.cache.get(roleData.transferPingRole);
                if (transferPingRole) {
                    mentionText = transferPingRole.toString();
                }
            }

            const message = await announcementChannel.send({
                content: mentionText,
                embeds: [embed]
            });

            console.log('✅ Trade announcement sent successfully');
            return message;

        } catch (error) {
            console.error('❌ Trade announcement error:', error);
            return null;
        }
    }
    async handleBreleaseButton(client, interaction, params) {
        const [buttonType, playerId, presidentId, releaseType] = params;
        
        // Handle btrelease confirm/cancel buttons
        if (buttonType === 'confirm') {
            if (interaction.replied || interaction.deferred) {
                return;
            }

            const isAuthorized = interaction.user.id === presidentId;
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece fesih talebini yapan oyuncu onaylayabilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            const guild = interaction.guild;
            const player = await guild.members.fetch(playerId);
            
            if (!player) {
                return interaction.editReply('❌ Oyuncu bulunamadı!');
            }

            try {
                const permissions = require('../utils/permissions');
                await permissions.makePlayerFree(player);

                const channels = require('../utils/channels');
                await channels.createFreeAgentAnnouncement(guild, player.user, 'Tek taraflı fesih');

                await interaction.editReply(`✅ **${player.displayName}** başarıyla serbest futbolcu oldu ve duyuru kanalına eklendi!`);
            } catch (error) {
                console.error('BRelease onaylama hatası:', error);
                await interaction.editReply('❌ Fesih işlemi tamamlanırken bir hata oluştu!');
            }

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
            const isAuthorized = interaction.user.id === presidentId;
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece fesih talebini yapan oyuncu iptal edebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply(`❌ Tek taraflı fesih talebi iptal edildi.`);

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

        // Regular brelease button handling for mutual releases
        const guild = interaction.guild;
        const player = await guild.members.fetch(presidentId); // Player who initiated
        const president = await guild.members.fetch(playerId); // President who was tagged
        
        if (!player || !president) {
            return interaction.reply({
                content: '❌ Kullanıcılar bulunamadı!',
                ephemeral: true
            });
        }

        // Authorization checks
        if (buttonType === 'accept' || buttonType === 'reject') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Bu fesih teklifini sadece etiketlenen başkan kabul edebilir veya reddedebilir!',
                    ephemeral: true
                });
            }
        } else if (buttonType === 'edit') {
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Bu butonu sadece fesih talebini yapan oyuncu kullanabilir!',
                    ephemeral: true
                });
            }
        }

        await interaction.deferReply();

        if (buttonType === 'accept') {
            try {
                const permissions = require('../utils/permissions');
                await permissions.makePlayerFree(player);

                // Extract form data from embed to use in announcement
                const embed = interaction.message.embeds[0];
                const fields = embed.fields;
                const releaseData = {
                    oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
                    reason: fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
                    compensation: fields.find(f => f.name.includes('Tazminat'))?.value || '',
                    newTeam: fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
                };

                const channels = require('../utils/channels');
                await channels.createFreeAgentAnnouncement(guild, player.user, releaseData.reason, releaseData);

                await interaction.editReply(`✅ **${player.displayName}** ile karşılıklı fesih tamamlandı! Oyuncu serbest futbolcu oldu.`);
            } catch (error) {
                console.error('BRelease kabul hatası:', error);
                await interaction.editReply('❌ Fesih işlemi tamamlanırken bir hata oluştu!');
            }

            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete('Karşılıklı fesih tamamlandı');
                    }
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                }
            }, 2000);

        } else if (buttonType === 'reject') {
            await interaction.editReply(`❌ **${president.displayName}** fesih teklifini reddetti.`);
            
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete('Fesih teklifi reddedildi');
                    }
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                }
            }, 2000);

        } else if (buttonType === 'edit') {
            await this.showEditBreleaseModal(client, interaction, playerId, presidentId);
        }

        if (buttonType === 'accept' || buttonType === 'reject') {
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
        }
    }

    async showEditBreleaseModal(client, interaction, presidentId, playerId, releaseType) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields - using same structure as regular release
        const existingData = {
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            reason: fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
            compensation: fields.find(f => f.name.includes('Tazminat'))?.value || '',
            newTeam: fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`brelease_modal_${presidentId}_${playerId}_${releaseType}`)
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
            .setValue(existingData.compensation)
            .setRequired(true);

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Takım')
            .setStyle('SHORT')
            .setValue(existingData.newTeam)
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(reasonInput),
            new MessageActionRow().addComponents(compensationInput),
            new MessageActionRow().addComponents(newTeamInput)
        );

        await interaction.showModal(modal);
    }

    async handleShowBreleaseForm(client, interaction, params) {
        const [presidentId, playerId, releaseType] = params;
        
        const modal = new Modal()
            .setCustomId(`brelease_modal_${presidentId}_${playerId}_${releaseType}`)
            .setTitle('Karşılıklı Fesih Formu');

        // Use same fields as regular release command
        const oldClubInput = new TextInputComponent()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle('SHORT')
            .setPlaceholder('Mevcut kulübünüz')
            .setRequired(true);

        const reasonInput = new TextInputComponent()
            .setCustomId('reason')
            .setLabel('Fesih Nedeni')
            .setStyle('PARAGRAPH')
            .setPlaceholder('Fesih nedeninizi belirtin...')
            .setRequired(true);

        const compensationInput = new TextInputComponent()
            .setCustomId('compensation')
            .setLabel('Tazminat')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 500.000 TL')
            .setRequired(true);

        const newTeamInput = new TextInputComponent()
            .setCustomId('new_team')
            .setLabel('Yeni Takım')
            .setStyle('SHORT')
            .setPlaceholder('Gideceğiniz takım (opsiyonel)')
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(reasonInput),
            new MessageActionRow().addComponents(compensationInput),
            new MessageActionRow().addComponents(newTeamInput)
        );

        await interaction.showModal(modal);
    }
}

module.exports = ButtonHandler;