const { MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const config = require('../config');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();
const globalLogger = require('../utils/globalLogger');
const TransferTracker = require('../utils/transferTracker');
const transferTracker = new TransferTracker();
const EconomyManager = require('../utils/economy');
const economy = new EconomyManager();

class ButtonHandler {
    constructor() {
        this.processedInteractions = new Set();
    }

    extractTransferAmount(embed) {
        // Extract amount from different embed fields
        if (!embed || !embed.fields) return 'Belirtilmemiş';
        
        for (const field of embed.fields) {
            if (field.name.includes('Transfer Bedeli') || field.name.includes('Kiralık Bedeli') || 
                field.name.includes('Maaş') || field.name.includes('Ücret') || field.name.includes('Yıllık Maaş')) {
                return field.value.replace('💰 ', '').replace('₺ ', '');
            }
        }
        return 'Belirtilmemiş';
    }

    // Extract specific monetary amounts from embed fields
    extractAmountFromField(embed, fieldNames) {
        if (!embed || !embed.fields) return null;
        
        for (const field of embed.fields) {
            for (const fieldName of fieldNames) {
                if (field.name.includes(fieldName)) {
                    const amountText = field.value.replace(/💰|₺|TL|€/g, '').trim();
                    const parsedAmount = economy.parseAmount(amountText);
                    return parsedAmount > 0 ? parsedAmount : null;
                }
            }
        }
        return null;
    }

    // Process automatic payments for transfer commands
    async processTransferPayment(interaction, commandUser, targetUser, transferAmount, salaryAmount, transferType) {
        const guildId = interaction.guild.id;
        
        try {
            // Check if command user has enough money
            const commandUserData = economy.getUserData(guildId, commandUser.id);
            const totalRequired = (transferAmount || 0) + (salaryAmount || 0);
            
            if (commandUserData.cash < totalRequired) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('💸 Transfer İptal - Yetersiz Bakiye')
                    .setDescription(`❌ **Transfer iptal edildi!**\n\n**Gerekli toplam para:** ${economy.formatAmount(totalRequired)}\n**Mevcut paran:** ${economy.formatAmount(commandUserData.cash)}\n**Eksik:** ${economy.formatAmount(totalRequired - commandUserData.cash)}`)
                    .addField('💡 Çözüm', 'Para kazanmak için:\n• `.work` - Çalışarak para kazan\n• `.tk miktar` - Bankadan para çek\n• Başka oyunculardan para iste', false)
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
                return { success: false, reason: 'insufficient_funds' };
            }

            const payments = [];

            // Process transfer fee payment
            if (transferAmount && transferAmount > 0) {
                const transferResult = economy.transferMoney(guildId, commandUser.id, targetUser.id, transferAmount);
                if (transferResult.success) {
                    payments.push({
                        type: 'transfer',
                        amount: transferAmount,
                        to: targetUser.tag,
                        description: transferType === 'hire' ? 'Kiralık Bedeli' : 'Transfer Bedeli'
                    });
                }
            }

            // Process salary payment (for contract/hire commands)
            if (salaryAmount && salaryAmount > 0 && transferType !== 'offer') {
                // Find the player (third person mentioned in contract/hire)
                const embed = interaction.message.embeds[0];
                const playerMention = this.findPlayerMention(embed, transferType);
                
                if (playerMention) {
                    const playerId = playerMention.replace(/[<@!>]/g, '');
                    const salaryResult = economy.transferMoney(guildId, commandUser.id, playerId, salaryAmount);
                    if (salaryResult.success) {
                        payments.push({
                            type: 'salary',
                            amount: salaryAmount,
                            to: `<@${playerId}>`,
                            description: 'Maaş Ödemesi'
                        });
                    }
                }
            }

            // For offer command, pay the target user directly
            if (transferType === 'offer' && salaryAmount && salaryAmount > 0) {
                const offerResult = economy.transferMoney(guildId, commandUser.id, targetUser.id, salaryAmount);
                if (offerResult.success) {
                    payments.push({
                        type: 'offer',
                        amount: salaryAmount,
                        to: targetUser.tag,
                        description: 'Teklif Ödemesi'
                    });
                }
            }

            // Send payment confirmation
            if (payments.length > 0) {
                const paymentEmbed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('💸 Otomatik Ödeme Tamamlandı')
                    .setDescription(`✅ **Transfer ödemeleri başarılı!**\n\n💰 **Toplam ödenen:** ${economy.formatAmount(totalRequired)}`)
                    .addField('📋 Ödeme Detayları', 
                        payments.map(p => `💰 **${p.description}:** ${economy.formatAmount(p.amount)} → ${p.to}`).join('\n'), 
                        false)
                    .setTimestamp();

                await interaction.followUp({ embeds: [paymentEmbed] });
            }

            return { success: true, payments };

        } catch (error) {
            console.error('Payment processing error:', error);
            return { success: false, reason: 'processing_error' };
        }
    }

    // Helper to find player mention in embed for salary payments
    findPlayerMention(embed, transferType) {
        if (!embed || !embed.description) return null;
        
        const mentionRegex = /<@!?(\d+)>/g;
        const mentions = embed.description.match(mentionRegex);
        
        if (!mentions) return null;
        
        // For contract/hire, player is usually the third mention
        if (transferType === 'contract' || transferType === 'hire') {
            return mentions[2] || null; // Third mentioned user
        }
        
        return null;
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
            console.log(`Button interaction: ${customId} | Action: ${customId.split('_')[0]} | Params: ${customId.split('_').slice(1).join(', ')}`);

            // Handle show_trade_modal_ buttons specially
            if (customId.startsWith('show_trade_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'trade', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[3]; // For trade: [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowTradeForm(client, interaction, params);
                return;
            }

            // Special handling for contract_player buttons first
            if (customId.startsWith('contract_player_')) {
                const params = customId.split('_').slice(2); // Remove 'contract' and 'player'
                console.log('Contract player button routing:', { customId, params });
                await this.handleContractPlayerButton(client, interaction, params);
                return;
            }

            // Handle show_hire_modal_ buttons specially
            if (customId.startsWith('show_hire_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'hire', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[2]; // For hire: [targetPresidentId, playerId, presidentId]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                // Check if interaction is still valid
                if (interaction.replied || interaction.deferred) {
                    console.log('Interaction already processed, skipping');
                    return;
                }
                
                await this.handleShowHireForm(client, interaction, params);
                return;
            }

            // Handle show_contract_modal_ buttons specially
            if (customId.startsWith('show_contract_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'contract', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[2]; // For contract: [targetPresidentId, playerId, presidentId]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowContractForm(client, interaction, params);
                return;
            }

            // Handle show_trelease_modal_ buttons specially
            if (customId.startsWith('show_trelease_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'trelease', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[1]; // For trelease: [playerId, presidentId, releaseType]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowTReleaseForm(client, interaction, params);
                return;
            }

            // Handle show_btrelease_modal_ buttons specially
            if (customId.startsWith('show_btrelease_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'btrelease', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[1]; // For btrelease: [playerId, presidentId, releaseType]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowBTReleaseForm(client, interaction, params);
                return;
            }

            // Handle show_release_modal_ buttons specially
            if (customId.startsWith('show_release_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'release', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[1]; // For release: [playerId, presidentId, releaseType]
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowReleaseForm(client, interaction, params);
                return;
            }

            // Handle show_brelease_modal_ buttons specially  
            if (customId.startsWith('show_brelease_modal_')) {
                const params = customId.split('_').slice(3); // Remove 'show', 'brelease', 'modal'
                
                // Authorization check - only command creator can use their button
                const commandCreatorId = params[1]; // For brelease: [playerId, presidentId, releaseType] - player who initiated
                if (interaction.user.id !== commandCreatorId) {
                    return interaction.reply({
                        content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                        ephemeral: true
                    });
                }
                
                await this.handleShowBreleaseForm(client, interaction, params);
                return;
            }

            const [action, ...params] = customId.split('_');

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
                    await this.handleContractButton(client, interaction, params);
                    break;
                case 'contract_player':
                    await this.handleContractPlayerButton(client, interaction, params);
                    break;
                case 'trade':
                    if (params[0] === 'player') {
                        await this.handleTradePlayerButton(client, interaction, params.slice(1));
                    } else if (params[0] === 'fill' && params[1] === 'form') {
                        await this.handleTradeFillForm(client, interaction, params.slice(2));
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
                case 'trelease':
                    await this.handleTReleaseButton(client, interaction, params);
                    break;
                case 'btrelease':
                    await this.handleBTReleaseButton(client, interaction, params);
                    break;
                case 'hire':
                    if (params[0] === 'player') {
                        await this.handleHirePlayerButton(client, interaction, params.slice(1));
                    } else {
                        await this.handleHireButton(client, interaction, params);
                    }
                    break;
                case 'bduyur':
                    await this.handleBduyurButton(client, interaction, params);
                    break;
                case 'show':
                    if (customId.startsWith('show_announcement_modal_')) {
                        const params = customId.split('_').slice(3); // Remove 'show', 'announcement', 'modal'
                        // Authorization check - only command creator can use their button
                        const commandCreatorId = params[0]; // For announcement: [userId]
                        if (interaction.user.id !== commandCreatorId) {
                            return interaction.reply({
                                content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                                ephemeral: true
                            });
                        }
                        await this.handleShowAnnouncementForm(client, interaction, params);
                    } else if (customId.startsWith('show_offer_modal_')) {
                        const params = customId.split('_').slice(3); // Remove 'show', 'offer', 'modal'
                        // Authorization check - only command creator can use their button
                        const commandCreatorId = params[1]; // For offer: [playerId, presidentId]
                        if (interaction.user.id !== commandCreatorId) {
                            return interaction.reply({
                                content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                                ephemeral: true
                            });
                        }
                        await this.handleShowOfferForm(client, interaction, params);
                    } else if (customId.startsWith('show_bduyur_modal_')) {
                        const params = customId.split('_').slice(3); // Remove 'show', 'bduyur', 'modal'
                        // Authorization check - only command creator can use their button
                        const commandCreatorId = params[1]; // For bduyur: [playerId, presidentId]
                        if (interaction.user.id !== commandCreatorId) {
                            return interaction.reply({
                                content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                                ephemeral: true
                            });
                        }
                        await this.handleShowBduyurForm(client, interaction, params);
                    } else {
                        await this.handleShowButton(client, interaction, params);
                    }
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
                case 'tf':
                    await this.handleTfPagination(client, interaction, params);
                    break;
                case 'lb':
                    await this.handleLeaderboardPagination(client, interaction, params);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Bilinmeyen buton etkileşimi!', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Buton işleme hatası:', error);
            console.error('Error stack:', error.stack);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ Buton işlenirken bir hata oluştu!', 
                        ephemeral: true 
                    });
                }
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

            await interaction.deferReply();
            
            // Role management for offer - convert free agent to player
            try {
                console.log(`🔄 Offer: Starting role management for ${player.displayName}...`);
                const result = await permissions.signPlayer(player);
                console.log(`🔄 Offer role management result: ${result}`);
                
                if (result) {
                    console.log(`✅ Offer: Successfully updated roles for ${player.displayName}`);
                } else {
                    console.log(`❌ Offer: Failed to update roles for ${player.displayName}`);
                }
            } catch (error) {
                console.error('❌ Role management error in offer:', error);
            }

            // Transfer tracker - mark player as transferred
            transferTracker.markPlayerAsTransferred(guild.id, playerId, 'offer');
            console.log(`🔄 Oyuncu transfer olarak işaretlendi: ${player.displayName} (offer)`);
            
            // Extract transfer data from embed for automatic payment
            const embed = interaction.message.embeds[0];
            const fields = embed.fields;
            const salaryText = fields.find(f => f.name.includes('Maaş') || f.name.includes('Ücret'))?.value || 'Belirtilmemiş';
            
            // Economy manager for automatic payments
            const EconomyManager = require('../utils/economy');
            const economy = new EconomyManager();
            
            // Parse amount
            const salaryAmount = economy.parseAmount(salaryText);
            
            // Check if command user (president) has enough money
            const presidentData = economy.getUserData(guild.id, presidentId);
            const presidentBalance = presidentData.cash;
            
            if (presidentBalance < salaryAmount) {
                // Revert role changes
                try {
                    await permissions.makePlayerFree(player);
                    console.log(`🔄 Offer cancelled: Reverted roles for ${player.displayName}`);
                } catch (error) {
                    console.error('Role revert error:', error);
                }
                
                // Remove transfer tracking
                transferTracker.removePlayerTransfer(guild.id, playerId);
                
                await interaction.editReply({
                    content: `❌ **Teklif İptal!** ${president} yeterli bakiye yok!\n**Gerekli:** ${economy.formatAmount(salaryAmount)}\n**Mevcut:** ${economy.formatAmount(presidentBalance)}`
                });
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Teklif iptal - Yetersiz bakiye");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;
            }
            
            // Automatic payment
            if (salaryAmount && salaryAmount > 0) {
                const payment = economy.transferMoney(guild.id, presidentId, playerId, salaryAmount);
                if (!payment.success) {
                    // Revert role changes
                    try {
                        await permissions.makePlayerFree(player);
                        console.log(`🔄 Offer cancelled: Reverted roles for ${player.displayName}`);
                    } catch (error) {
                        console.error('Role revert error:', error);
                    }
                    
                    // Remove transfer tracking
                    transferTracker.removePlayerTransfer(guild.id, playerId);
                    
                    await interaction.editReply({
                        content: `❌ **Teklif İptal!** Ödeme hatası: ${payment.message}`
                    });
                    
                    // Delete channel after 5 seconds
                    setTimeout(async () => {
                        try {
                            if (interaction.channel && interaction.channel.deletable) {
                                await interaction.channel.delete("Teklif iptal - Ödeme hatası");
                            }
                        } catch (error) {
                            console.error('Channel deletion error:', error);
                        }
                    }, 5000);
                    return;
                }
            }

            // Send automatic payment confirmation
            await interaction.editReply({
                content: `✅ **Teklif Kabul Edildi!**\n\n**Otomatik Ödeme:**\n💰 Maaş: ${economy.formatAmount(salaryAmount)} → ${player}\n\n${president} tarafından otomatik olarak ödendi!`
            });

            // Send transfer announcement
            await this.sendTransferAnnouncement(guild, {
                type: 'offer',
                player: player,
                president: president,
                embed: embed
            });

            // Disable buttons
            const updatedEmbed = new MessageEmbed(embed);
            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('completed')
                    .setLabel('✅ Teklif Tamamlandı')
                    .setStyle('SUCCESS')
                    .setDisabled(true)
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [row]
            });

            // Delete channel after 5 seconds
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete("Teklif tamamlandı - Otomatik ödeme");
                    }
                } catch (error) {
                    console.error('Channel deletion error:', error);
                }
            }, 5000);

        } else if (buttonType === 'reject') {
            // Anyone in the channel can reject unreasonable offers

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
            }, 5000);

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
            
            await interaction.editReply({
                content: `✅ Başkan onayladı! Oyuncu onayı için kanal oluşturuluyor...`
            });

            // Create player approval channel
            const channels = require('../utils/channels');
            const embeds = require('../utils/embeds');
            
            const playerChannel = await channels.createNegotiationChannel(guild, president.user, player.user, 'contract_player', null, true);
            if (!playerChannel) {
                return interaction.editReply({ content: 'Oyuncu onay kanalı oluşturulamadı!' });
            }

            // Extract original contract data from current embed and create contract form for player approval
            const originalEmbed = interaction.message.embeds[0];
            const contractData = {
                transferFee: originalEmbed.fields.find(f => f.name.includes('Transfer Bedeli'))?.value || 'Belirtilmemiş',
                oldClub: originalEmbed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş', 
                newClub: originalEmbed.fields.find(f => f.name.includes('Yeni Kulüp'))?.value || 'Belirtilmemiş',
                salary: originalEmbed.fields.find(f => f.name.includes('Maaş'))?.value || 'Belirtilmemiş',
                contractDuration: originalEmbed.fields.find(f => f.name.includes('Sözleşme'))?.value || 'Belirtilmemiş'
            };
            
            console.log('Contract data extracted:', contractData);
            const contractEmbed = embeds.createContractForm(president.user, targetPresident.user, player.user, contractData);
            
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
                content: `${player.user} ${president.user} sözleşme anlaşmasını onaylamanız bekleniyor.\n\n${targetPresident.user} başkan anlaşmayı onayladı.\n\n*Not: ${president.user} başkan da bu kanalı görebilir.*`,
                embeds: [contractEmbed],
                components: [playerButtons]
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

            // Delete president negotiation channel after creating player channel
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
            }, 5000);

        } else if (buttonType === 'reject') {
            // Anyone in the channel can reject unreasonable contract offers

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
            }, 5000);

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
        // For contract_player_accept_ buttons, params from slice(2) are: ['accept', 'targetPresidentId', 'playerId', 'presidentId']
        const buttonType = params[0]; // 'accept', 'reject', or 'edit'
        const targetPresidentId = params[1];
        const playerId = params[2];
        const presidentId = params[3];
        const guild = interaction.guild;
        
        console.log('Contract player button debug:', { buttonType, targetPresidentId, playerId, presidentId });
        console.log('Contract payment debug - User IDs:', {
            targetPresidentId: targetPresidentId,
            playerId: playerId, 
            presidentId: presidentId,
            interactionUserId: interaction.user.id
        });
        
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);
        const targetPresident = await guild.members.fetch(targetPresidentId);
        
        console.log('Contract payment debug - User mentions:', {
            targetPresident: targetPresident.toString(),
            player: player.toString(),
            president: president.toString()
        });

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

            await interaction.deferReply();
            
            // Extract transfer data from embed
            const embed = interaction.message.embeds[0];
            const fields = embed.fields;
            
            // Extract both payment amounts from form
            const transferFeeText = fields.find(f => f.name.includes('Transfer Bedeli'))?.value || 'Belirtilmemiş';
            const playerSalaryText = fields.find(f => f.name.includes('Maaş'))?.value || 'Belirtilmemiş';
            
            // Economy manager for automatic payments
            const EconomyManager = require('../utils/economy');
            const economy = new EconomyManager();
            
            // Parse amounts
            const transferFee = economy.parseAmount(transferFeeText);
            const playerSalary = economy.parseAmount(playerSalaryText);
            const totalAmount = (transferFee || 0) + (playerSalary || 0);
            
            // Check if command user (president) has enough money
            const presidentData = economy.getUserData(guild.id, presidentId);
            const presidentBalance = presidentData.cash;
            
            if (presidentBalance < totalAmount) {
                await interaction.editReply({
                    content: `❌ **Transfer İptal!** ${president} yeterli bakiye yok!\n**Gerekli:** ${economy.formatAmount(totalAmount)}\n**Mevcut:** ${economy.formatAmount(presidentBalance)}`
                });
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Transfer iptal - Yetersiz bakiye");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;
            }
            
            // Automatic payments
            let paymentSuccess = true;
            let paymentErrors = [];
            
            // Payment 1: Transfer fee to target president
            if (transferFee && transferFee > 0) {
                const payment1 = economy.transferMoney(guild.id, presidentId, targetPresidentId, transferFee);
                if (!payment1.success) {
                    paymentSuccess = false;
                    paymentErrors.push(`Transfer bedeli ödeme hatası: ${payment1.message}`);
                }
            }
            
            // Payment 2: Salary to player
            if (playerSalary && playerSalary > 0) {
                const payment2 = economy.transferMoney(guild.id, presidentId, playerId, playerSalary);
                if (!payment2.success) {
                    paymentSuccess = false;
                    paymentErrors.push(`Maaş ödeme hatası: ${payment2.message}`);
                }
            }
            
            if (!paymentSuccess) {
                await interaction.editReply({
                    content: `❌ **Transfer İptal!** Ödeme hatası:\n${paymentErrors.join('\n')}`
                });
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Transfer iptal - Ödeme hatası");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;
            }

            // Transfer tracker - mark player as transferred
            transferTracker.markPlayerAsTransferred(guild.id, playerId, 'contract');
            console.log(`🔄 Oyuncu transfer olarak işaretlendi: ${player.displayName} (contract)`);
            
            // Send automatic payment confirmation
            let paymentDetails = [];
            if (transferFee && transferFee > 0) {
                paymentDetails.push(`💰 Transfer bedeli: ${economy.formatAmount(transferFee)} → ${targetPresident}`);
            }
            if (playerSalary && playerSalary > 0) {
                paymentDetails.push(`💰 Maaş: ${economy.formatAmount(playerSalary)} → ${player}`);
            }

            await interaction.editReply({
                content: `✅ **Sözleşme Kabul Edildi!**\n\n**Otomatik Ödemeler:**\n${paymentDetails.join('\n')}\n\n${president} tarafından otomatik olarak ödendi!`
            });

            // Send transfer announcement
            await this.sendTransferAnnouncement(guild, {
                type: 'contract',
                player: player,
                president: president,
                embed: embed
            });

            // Disable buttons
            const updatedEmbed = new MessageEmbed(embed);
            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('completed')
                    .setLabel('✅ Transfer Tamamlandı')
                    .setStyle('SUCCESS')
                    .setDisabled(true)
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [row]
            });

            // Delete channel after 5 seconds
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete("Transfer tamamlandı - Otomatik ödeme");
                    }
                } catch (error) {
                    console.error('Channel deletion error:', error);
                }
            }, 5000);

        } else if (buttonType === 'reject') {
            // Anyone in the channel can reject unreasonable contract agreements

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
            }, 5000);
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
            await this.showEditContractModal(client, interaction, targetPresidentId, playerId, presidentId);
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
                content: `${wantedPlayer.user} ${givenPlayer.user}\n\n🔄 **TAKAS - Oyuncu Onayı**\n\nBu takas için her iki oyuncunun da onayı gerekiyor.\n\n**İstenen Oyuncu:** ${wantedPlayer.user}\n**Verilen Oyuncu:** ${givenPlayer.user}\n\n${targetPresident.user} ve ${president.user} başkanlar anlaştı. Şimdi sıra sizde!\n\n*Not: Başkanlar bu kanalı görebilir ve maaş düzenlemesi yapabilir.*`,
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
            }, 5000);

        } else if (buttonType === 'reject') {
            // Defer immediately to prevent timeout
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }
            
            // Anyone in the channel can reject unreasonable trade offers
            
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
                        await channelToDelete.delete("Takas reddedildi - Transfer tamamen iptal");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 5000);

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
            }, 5000);

        } else if (buttonType === 'edit') {
            // Check if user is authorized (president who made trade or target president)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === presidentId || interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan, hedef başkan veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Show president trade form modal (not player salary modal)
            try {
                await this.showEditTradePresidentModal(client, interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId);
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
                            content: `✅ ${wantedPlayer.user} (Yetkili tarafından onaylandı) takası kabul etti! ${global[acceptanceKey].givenPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
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
                            content: `✅ ${givenPlayer.user} (Yetkili tarafından onaylandı) takası kabul etti! Her iki oyuncu da kabul etti!`
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
                console.log(`✅ Wanted player ${wantedPlayer.user.username} accepted! Status:`, global[acceptanceKey]);
                
                // Disable reject button for this player who accepted
                try {
                    const currentButtons = interaction.message.components[0].components;
                    const updatedButtons = currentButtons.map(button => {
                        const buttonData = new MessageButton()
                            .setCustomId(button.customId)
                            .setLabel(button.label)
                            .setStyle(button.style);
                        
                        if (button.emoji) {
                            buttonData.setEmoji(button.emoji);
                        }
                        
                        // Disable reject button for the player who just accepted
                        if (button.customId.includes('reject') && !global[acceptanceKey].givenPlayer) {
                            buttonData.setDisabled(true);
                        } else {
                            buttonData.setDisabled(button.disabled || false);
                        }
                        
                        return buttonData;
                    });
                    
                    await interaction.message.edit({
                        embeds: interaction.message.embeds,
                        components: [new MessageActionRow().addComponents(updatedButtons)]
                    });
                } catch (buttonError) {
                    console.error('Button update error:', buttonError);
                }
                
                // Send response without throwing on error
                try {
                    await interaction.editReply({
                        content: `✅ ${wantedPlayer.user} takası kabul etti! ${global[acceptanceKey].givenPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
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
                console.log(`✅ Given player ${givenPlayer.user.username} accepted! Status:`, global[acceptanceKey]);
                
                // Disable reject button for this player who accepted
                try {
                    const currentButtons = interaction.message.components[0].components;
                    const updatedButtons = currentButtons.map(button => {
                        const buttonData = new MessageButton()
                            .setCustomId(button.customId)
                            .setLabel(button.label)
                            .setStyle(button.style);
                        
                        if (button.emoji) {
                            buttonData.setEmoji(button.emoji);
                        }
                        
                        // Disable reject button for the player who just accepted
                        if (button.customId.includes('reject') && !global[acceptanceKey].wantedPlayer) {
                            buttonData.setDisabled(true);
                        } else {
                            buttonData.setDisabled(button.disabled || false);
                        }
                        
                        return buttonData;
                    });
                    
                    await interaction.message.edit({
                        embeds: interaction.message.embeds,
                        components: [new MessageActionRow().addComponents(updatedButtons)]
                    });
                } catch (buttonError) {
                    console.error('Button update error:', buttonError);
                }
                
                // Send response without throwing on error
                try {
                    await interaction.editReply({
                        content: `✅ ${givenPlayer.user} takası kabul etti! ${global[acceptanceKey].wantedPlayer ? 'Her iki oyuncu da kabul etti!' : 'Diğer oyuncunun kararı bekleniyor...'}`
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
                console.log('🎉🎉🎉 BOTH PLAYERS ACCEPTED! Starting payment verification process...');
                
                try {
                    // Store pending payment info for trade completion
                    const pendingPayments = global.pendingPayments || new Map();
                    global.pendingPayments = pendingPayments;
                    
                    // Extract trade data from embed
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

                    // Store payment requirements for both presidents
                    pendingPayments.set(interaction.channel.id, {
                        payerId1: presidentId,
                        receiverId1: givenPlayerId,
                        amount1: tradeData.givenPlayerSalary,
                        payerId2: targetPresidentId,
                        receiverId2: wantedPlayerId,
                        amount2: tradeData.wantedPlayerSalary,
                        channelId: interaction.channel.id,
                        type: 'trade',
                        wantedPlayerUser: wantedPlayer,
                        givenPlayerUser: givenPlayer,
                        targetPresidentUser: targetPresident,
                        presidentUser: president,
                        embed: embed,
                        tradeData: tradeData,
                        payments: { president: false, targetPresident: false }
                    });

                    // Send payment instructions to both presidents
                    const paymentEmbed = new MessageEmbed()
                        .setColor('#FFD700')
                        .setTitle('💰 Ödeme Gerekli - Takas')
                        .setDescription('**Her iki oyuncu da kabul etti!** Her iki başkanın da ödeme yapması gerekiyor.')
                        .addField(`${president} Ödeyecek`, `${givenPlayer} - ${tradeData.givenPlayerSalary}`, true)
                        .addField(`${targetPresident} Ödeyecek`, `${wantedPlayer} - ${tradeData.wantedPlayerSalary}`, true)
                        .addField('Ödeme Komutları', 
                            `${president}: \`.pay ${givenPlayer} ${tradeData.givenPlayerSalary}\`\n` +
                            `${targetPresident}: \`.pay ${wantedPlayer} ${tradeData.wantedPlayerSalary}\``, false)
                        .addField('⚠️ Uyarı', '**Fiyatı Doğru yazmazsan 5 Saat Mute yiyeceksin! Yanlış yazarsan telafisi vardır**', false)
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [paymentEmbed] });

                    // Clear acceptance tracking
                    delete global[acceptanceKey];
                    
                    console.log('✅ Trade payment verification setup completed');
                } catch (error) {
                    console.error('❌ Trade payment setup error:', error);
                    await interaction.editReply({
                        content: `❌ Ödeme sistemi kurulurken hata oluştu: ${error.message}`
                    });
                }
            }
        } else if (buttonType === 'reject') {
            // Check if interaction is already replied or deferred
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }
            
            // Anyone in the channel can reject unreasonable trade player agreements

            await interaction.editReply({
                content: `❌ ${interaction.user} tarafından takas reddedildi! Tüm transfer iptal oldu.`
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

            // Clean up all acceptance tracking - entire trade is cancelled
            const channelName = interaction.channel.name;
            const acceptanceKey = `trade_acceptances_${channelName}`;
            const globalAcceptanceKey = `trade_acceptance_${wantedPlayerId}_${givenPlayerId}`;
            
            if (global[acceptanceKey]) {
                delete global[acceptanceKey];
                console.log('Channel acceptance tracking cleared - trade cancelled by rejection');
            }
            if (global[globalAcceptanceKey]) {
                delete global[globalAcceptanceKey];
                console.log('Global acceptance tracking cleared - trade cancelled by rejection');
            }

            // Delete channel after delay - entire trade cancelled
            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (channelToDelete && channelToDelete.deletable) {
                        console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                        await channelToDelete.delete("Takas reddedildi - Transfer tamamen iptal");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 5000);
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
            try {
                console.log(`TRelease button: Converting ${player.displayName} to free agent and cleaning up roles...`);
                const result = await permissions.makePlayerFree(player);
                console.log(`TRelease button role management result: ${result}`);
                
                if (result) {
                    console.log(`✅ TRelease button: Successfully updated roles for ${player.displayName}`);
                } else {
                    console.log(`❌ TRelease button: Failed to update roles for ${player.displayName}`);
                }
            } catch (error) {
                console.error('Role management error in trelease button:', error);
            }

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
                content: `✅ **${player.displayName}** tek taraflı fesih ile serbest futbolcu oldu! Roller güncellendi.`
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
                console.log(`🔄 Release: Starting role management for ${player.displayName}...`);
                const result = await permissions.makePlayerFree(player);
                console.log(`🔄 Release role management result: ${result}`);
                
                if (result) {
                    console.log(`✅ Release: Successfully updated roles for ${player.displayName}`);
                } else {
                    console.log(`❌ Release: Failed to update roles for ${player.displayName}`);
                }
            } catch (error) {
                console.error('❌ Role management error in release:', error);
            }
            
            // Extract release data from embed fields
            const embed = interaction.message.embeds[0];
            const releaseData = {
                oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş',
                reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || 'Belirtilmemiş',
                compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || '',
                newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
            };

            await interaction.deferReply();
            
            // Check if compensation is required
            const compensationAmount = releaseData.compensation?.trim();
            if (compensationAmount && compensationAmount.toLowerCase() !== 'yok' && compensationAmount !== '') {
                // Economy manager for automatic compensation payment
                const EconomyManager = require('../utils/economy');
                const economy = new EconomyManager();
                
                // Parse compensation amount
                const compensationValue = economy.parseAmount(compensationAmount);
                
                // Check if president has enough money
                const presidentData = economy.getUserData(guild.id, presidentId);
                const presidentBalance = presidentData.cash;
                
                if (presidentBalance < compensationValue) {
                    await interaction.editReply({
                        content: `❌ **Fesih İptal!** ${president} yeterli bakiye yok!\n**Gerekli tazminat:** ${economy.formatAmount(compensationValue)}\n**Mevcut bakiye:** ${economy.formatAmount(presidentBalance)}`
                    });
                    
                    // Delete channel after 5 seconds
                    setTimeout(async () => {
                        try {
                            if (interaction.channel && interaction.channel.deletable) {
                                await interaction.channel.delete("Fesih iptal - Yetersiz bakiye");
                            }
                        } catch (error) {
                            console.error('Channel deletion error:', error);
                        }
                    }, 5000);
                    return;
                }
                
                // Automatic compensation payment
                const payment = economy.transferMoney(guild.id, presidentId, playerId, compensationValue);
                if (!payment.success) {
                    await interaction.editReply({
                        content: `❌ **Fesih İptal!** Tazminat ödemesi başarısız: ${payment.message}`
                    });
                    
                    // Delete channel after 5 seconds
                    setTimeout(async () => {
                        try {
                            if (interaction.channel && interaction.channel.deletable) {
                                await interaction.channel.delete("Fesih iptal - Ödeme hatası");
                            }
                        } catch (error) {
                            console.error('Channel deletion error:', error);
                        }
                    }, 5000);
                    return;
                }
                
                // Send automatic payment confirmation
                await interaction.editReply({
                    content: `✅ **Fesih Kabul Edildi!**\n\n**Otomatik Tazminat Ödemesi:**\n💰 ${economy.formatAmount(compensationValue)} → ${player}\n\n${president} tarafından otomatik olarak ödendi!`
                });
                
                // Continue with release process
                await this.sendReleaseTransferAnnouncement(guild, player.user, releaseData, releaseType);
                
                // Disable buttons and complete release
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
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Fesih tamamlandı - Otomatik tazminat ödendi");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;

            } else {
                // No compensation required - complete release immediately
                await this.sendReleaseTransferAnnouncement(guild, player.user, releaseData, releaseType);
                
                await interaction.editReply({
                    content: `✅ Fesih kabul edildi! **${player.displayName}** artık serbest oyuncu ve roller güncellendi.`
                });
                
                // Disable all buttons immediately for no-compensation case
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
                
                // Complete release immediately with channel deletion
                setTimeout(async () => {
                    try {
                        const channelToDelete = interaction.channel;
                        if (channelToDelete && channelToDelete.deletable) {
                            console.log(`KANAL SİLİNİYOR ZORLA: ${channelToDelete.name}`);
                            await channelToDelete.delete("Fesih tamamlandı - Kanal otomatik silindi");
                            console.log('KANAL BAŞARIYLA SİLİNDİ');
                        }
                    } catch (error) {
                        console.error('KANAL SİLME HATASI:', error);
                    }
                }, 5000);
            }

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
            }, 5000);

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

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `✅ Başkan onayladı! Oyuncu onayı için kanal oluşturuluyor...`
            });

            // Create player approval channel
            const channels = require('../utils/channels');
            const embeds = require('../utils/embeds');
            
            const playerChannel = await channels.createNegotiationChannel(guild, president.user, player.user, 'hire_player', null, true);
            if (!playerChannel) {
                return interaction.editReply({ content: 'Oyuncu onay kanalı oluşturulamadı!' });
            }

            // Extract original hire data from current embed and create hire form for player approval
            const originalEmbed = interaction.message.embeds[0];
            const hireData = {
                loanFee: originalEmbed.fields.find(f => f.name.includes('Kiralık Bedeli'))?.value || 'Belirtilmemiş',
                oldClub: originalEmbed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş', 
                newClub: originalEmbed.fields.find(f => f.name.includes('Yeni Kulüp'))?.value || 'Belirtilmemiş',
                salary: originalEmbed.fields.find(f => f.name.includes('Maaş'))?.value || 'Belirtilmemiş',
                contractDuration: originalEmbed.fields.find(f => f.name.includes('Sözleşme'))?.value || 'Belirtilmemiş'
            };
            
            console.log('Hire data extracted:', hireData);
            const hireEmbed = embeds.createHireForm(president.user, targetPresident.user, player.user, hireData);
            
            const playerButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`hire_player_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`hire_player_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`hire_player_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await playerChannel.send({
                content: `${player.user} ${president.user} kiralık anlaşmasını onaylamanız bekleniyor.\n\n${targetPresident.user} başkan anlaşmayı onayladı.\n\n*Not: ${president.user} başkan da bu kanalı görebilir.*`,
                embeds: [hireEmbed],
                components: [playerButtons]
            });

            // Disable all buttons in current channel
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

            // Delete president negotiation channel after creating player channel
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
            }, 5000);

        } else if (buttonType === 'reject') {
            // Anyone in the channel can reject unreasonable hire offers

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
            }, 5000);

        } else if (buttonType === 'edit') {
            // Sadece komutu kullanan kişi (başkan) düzenleyebilir
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditHireModal(client, interaction, targetPresidentId, playerId, presidentId);
        }
    }

    async handleHirePlayerButton(client, interaction, params) {
        const [buttonType, targetPresidentId, playerId, presidentId] = params;
        const guild = interaction.guild;
        
        console.log('Hire player button debug:', { buttonType, targetPresidentId, playerId, presidentId });
        console.log('Hire payment debug - User IDs:', {
            targetPresidentId: targetPresidentId,
            playerId: playerId, 
            presidentId: presidentId,
            interactionUserId: interaction.user.id
        });
        
        const targetPresident = await guild.members.fetch(targetPresidentId);
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);
        
        console.log('Hire payment debug - User mentions:', {
            targetPresident: targetPresident.toString(),
            player: player.toString(),
            president: president.toString()
        });

        if (buttonType === 'accept') {
            // Check if user is authorized (player or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu veya transfer yetkilileri kiralık anlaşmasını kabul edebilir!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();
            
            // Extract transfer data from embed
            const embed = interaction.message.embeds[0];
            const fields = embed.fields;
            
            // Extract both payment amounts from form
            const loanFeeText = fields.find(f => f.name.includes('Kiralık Bedeli'))?.value || 'Belirtilmemiş';
            const playerSalaryText = fields.find(f => f.name.includes('Maaş'))?.value || 'Belirtilmemiş';
            
            // Economy manager for automatic payments
            const EconomyManager = require('../utils/economy');
            const economy = new EconomyManager();
            
            // Parse amounts
            const loanFee = economy.parseAmount(loanFeeText);
            const playerSalary = economy.parseAmount(playerSalaryText);
            const totalAmount = (loanFee || 0) + (playerSalary || 0);
            
            // Check if command user (president) has enough money
            const presidentData = economy.getUserData(guild.id, presidentId);
            const presidentBalance = presidentData.cash;
            
            if (presidentBalance < totalAmount) {
                await interaction.editReply({
                    content: `❌ **Kiralık İptal!** ${president} yeterli bakiye yok!\n**Gerekli:** ${economy.formatAmount(totalAmount)}\n**Mevcut:** ${economy.formatAmount(presidentBalance)}`
                });
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Kiralık iptal - Yetersiz bakiye");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;
            }
            
            // Automatic payments
            let paymentSuccess = true;
            let paymentErrors = [];
            
            // Payment 1: Loan fee to target president
            if (loanFee && loanFee > 0) {
                const payment1 = economy.transferMoney(guild.id, presidentId, targetPresidentId, loanFee);
                if (!payment1.success) {
                    paymentSuccess = false;
                    paymentErrors.push(`Kiralık bedeli ödeme hatası: ${payment1.message}`);
                }
            }
            
            // Payment 2: Salary to player
            if (playerSalary && playerSalary > 0) {
                const payment2 = economy.transferMoney(guild.id, presidentId, playerId, playerSalary);
                if (!payment2.success) {
                    paymentSuccess = false;
                    paymentErrors.push(`Maaş ödeme hatası: ${payment2.message}`);
                }
            }
            
            if (!paymentSuccess) {
                await interaction.editReply({
                    content: `❌ **Kiralık İptal!** Ödeme hatası:\n${paymentErrors.join('\n')}`
                });
                
                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete("Kiralık iptal - Ödeme hatası");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
                return;
            }
            
            // Send automatic payment confirmation
            let paymentDetails = [];
            if (loanFee && loanFee > 0) {
                paymentDetails.push(`💰 Kiralık bedeli: ${economy.formatAmount(loanFee)} → ${targetPresident}`);
            }
            if (playerSalary && playerSalary > 0) {
                paymentDetails.push(`💰 Maaş: ${economy.formatAmount(playerSalary)} → ${player}`);
            }

            await interaction.editReply({
                content: `✅ **Kiralık Anlaşması Kabul Edildi!**\n\n**Otomatik Ödemeler:**\n${paymentDetails.join('\n')}\n\n${president} tarafından otomatik olarak ödendi!`
            });

            // Send transfer announcement
            await this.sendTransferAnnouncement(guild, {
                type: 'hire',
                player: player,
                president: president,
                embed: embed
            });

            // Disable buttons
            const updatedEmbed = new MessageEmbed(embed);
            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('completed')
                    .setLabel('✅ Kiralık Tamamlandı')
                    .setStyle('SUCCESS')
                    .setDisabled(true)
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [row]
            });

            // Delete channel after 5 seconds
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete("Kiralık tamamlandı - Otomatik ödeme");
                    }
                } catch (error) {
                    console.error('Channel deletion error:', error);
                }
            }, 5000);

        } else if (buttonType === 'reject') {
            // Anyone in the channel can reject unreasonable hire agreements

            await interaction.deferReply();
            
            await interaction.editReply({
                content: `❌ Kiralık anlaşması oyuncu tarafından reddedildi!`
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
                        await channelToDelete.delete("Kiralık anlaşması reddedildi");
                        console.log('KANAL BAŞARIYLA SİLİNDİ');
                    }
                } catch (error) {
                    console.error('KANAL SİLME HATASI:', error);
                }
            }, 5000);

        } else if (buttonType === 'edit') {
            // Check if user is authorized (player, president, or transfer authority)
            const member = interaction.member;
            const isAuthorized = interaction.user.id === playerId || interaction.user.id === presidentId || interaction.user.id === targetPresidentId || permissions.isTransferAuthority(member);
            
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Sadece oyuncu, başkanlar veya transfer yetkilileri düzenleyebilir!',
                    ephemeral: true
                });
            }

            // Extract existing data from embed and show pre-filled modal
            await this.showEditHireModal(client, interaction, targetPresidentId, playerId, presidentId);
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

    async handleTfPagination(client, interaction, params) {
        try {
            await interaction.deferReply();
            
            const [direction, pageNum] = params;
            const currentPage = parseInt(pageNum);
            
            const fs = require('fs');
            const path = require('path');
            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            if (!fs.existsSync(transfersPath)) {
                return interaction.editReply('❌ Henüz hiç transfer kaydı yok!');
            }

            const transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            const guildTransfers = transfersData[interaction.guild.id] || [];

            if (guildTransfers.length === 0) {
                return interaction.editReply('❌ Bu sunucuda henüz hiç transfer kaydı yok!');
            }

            // Sayfalama
            const transfersPerPage = 10;
            const totalPages = Math.ceil(guildTransfers.length / transfersPerPage);
            
            if (currentPage < 1 || currentPage > totalPages) {
                return interaction.editReply('❌ Geçersiz sayfa numarası!');
            }

            const startIndex = (currentPage - 1) * transfersPerPage;
            const endIndex = startIndex + transfersPerPage;
            const currentTransfers = guildTransfers.slice(startIndex, endIndex);

            const config = require('../config');
            const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
            
            const embed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`📋 Transfer Listesi - Sayfa ${currentPage}/${totalPages}`)
                .setDescription(`Toplam ${guildTransfers.length} transfer kaydı`)
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi' });

            currentTransfers.forEach((transfer, index) => {
                const transferIndex = startIndex + index + 1;
                let transferText = `**${transferIndex}.** ${transfer.playerMention || transfer.player}`;
                
                if (transfer.type === 'offer') {
                    // Serbest transfer - eski kulüp gösterme
                    transferText += `\n📥 Yeni Kulüp: ${transfer.toTeam}`;
                } else if (transfer.type === 'trade') {
                    // Takas - başkanları etiketleyerek göster
                    transferText += `\n🔄 ${transfer.presidentMention || transfer.fromTeam} ↔ ${transfer.targetPresidentMention || transfer.toTeam}`;
                } else {
                    // Contract, hire vb. - sadece kulüp bilgileri
                    if (transfer.fromTeam) transferText += `\n📤 Eski Kulüp: ${transfer.fromTeam}`;
                    if (transfer.toTeam) transferText += `\n📥 Yeni Kulüp: ${transfer.toTeam}`;
                }
                
                transferText += `\n📅 ${transfer.date}`;
                
                embed.addFields({ name: `${config.emojis.football || '⚽'} ${transfer.type.toUpperCase()}`, value: transferText, inline: false });
            });

            // Sayfa butonları
            const buttons = new MessageActionRow();
            
            if (currentPage > 1) {
                buttons.addComponents(
                    new MessageButton()
                        .setCustomId(`tf_prev_${currentPage - 1}`)
                        .setLabel('◀ Önceki')
                        .setStyle('SECONDARY')
                );
            }

            if (currentPage < totalPages) {
                buttons.addComponents(
                    new MessageButton()
                        .setCustomId(`tf_next_${currentPage + 1}`)
                        .setLabel('Sonraki ▶')
                        .setStyle('SECONDARY')
                );
            }

            const messageData = { embeds: [embed] };
            if (buttons.components.length > 0) {
                messageData.components = [buttons];
            }

            await interaction.editReply(messageData);

        } catch (error) {
            console.error('TF pagination error:', error);
            await interaction.editReply('❌ Transfer listesi gösterilirken bir hata oluştu!');
        }
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
                .setDescription(`${wantedPlayer.user} ↔ ${givenPlayer.user}`)
                .addFields(
                    { name: '📈 İstenen Oyuncu', value: `${wantedPlayer.user}`, inline: true },
                    { name: '📉 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true },
                    { name: '🏟️ Kulüpler', value: `${targetPresident.user}'nin takımı ↔ ${president.user}'nin takımı`, inline: false }
                );

            // Add salary and contract details if available from tradeData
            if (tradeData) {
                if (tradeData.wantedPlayerSalary && tradeData.wantedPlayerSalary !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '💰 İstenen Oyuncunun Maaşı', value: `${tradeData.wantedPlayerSalary}€`, inline: true });
                }
                if (tradeData.givenPlayerSalary && tradeData.givenPlayerSalary !== 'Belirtilmemiş') {
                    announcementEmbed.addFields({ name: '💸 Verilecek Oyuncunun Maaşı', value: `${tradeData.givenPlayerSalary}€`, inline: true });
                }
                if (tradeData.additionalAmount && tradeData.additionalAmount !== 'Yok' && tradeData.additionalAmount !== 'Belirtilmemiş' && tradeData.additionalAmount.trim() !== '') {
                    announcementEmbed.addFields({ name: '💵 Ek Tazminat', value: `${tradeData.additionalAmount}€`, inline: true });
                }
                if (tradeData.bonus && tradeData.bonus !== 'Yok' && tradeData.bonus !== 'Belirtilmemiş' && tradeData.bonus.trim() !== '') {
                    announcementEmbed.addFields({ name: '🎁 İstenen Oyuncu Özellikleri', value: tradeData.bonus, inline: true });
                }
                if (tradeData.contractDuration && tradeData.contractDuration !== 'Belirtilmemiş' && tradeData.contractDuration.trim() !== '') {
                    announcementEmbed.addFields({ name: '📋 Sözleşme Süresi', value: tradeData.contractDuration, inline: true });
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
            const durationField = embedFields.find(f => f.name.includes('Sözleşme+Ek Madde'));
            const bonusField = embedFields.find(f => f.name.includes('İmza Bonusu'));
            
            const newTeam = newTeamField ? newTeamField.value : 'Bilinmiyor';
            const playerName = playerNameField ? playerNameField.value : `${player.user}`;
            const salary = salaryField ? salaryField.value : 'Bilinmiyor';
            const duration = durationField ? durationField.value : 'Bilinmiyor';
            const bonus = bonusField ? bonusField.value : 'Bilinmiyor';
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Teklifi Kabul Edildi!')
                .setDescription(`${player.user} teklifi kabul etti ve **${newTeam}** kulübüne transfer oldu!`)
                .addFields(
                    { name: '⚽ Oyuncu', value: `${player.user}`, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: newTeam, inline: true },
                    { name: '💰 Maaş', value: `${salary}€`, inline: true },
                    { name: '📅 Sözleşme+Ek Madde', value: duration, inline: true },
                    { name: '🎯 İmza Bonusu', value: `${bonus}€`, inline: true }
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
                .setDescription(`${player.user} kulüp değiştirdi!\n\n${oldClub} ➤ ${newClub}`)
                .addFields(
                    { name: '⚽ Oyuncu', value: `${player.user}`, inline: true },
                    { name: '🏆 Eski Kulüp', value: oldClub, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: newClub, inline: true },
                    { name: '💰 Transfer Bedeli', value: `${transferFee}€`, inline: true },
                    { name: '💸 Yıllık Maaş', value: `${salary}€`, inline: true },
                    { name: '📅 Sözleşme+Ek Madde', value: duration, inline: true }
                ).setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });
        } else if (transferData.type === 'hire') {
            // Hire transfer announcement
            const { player, president } = transferData;
            const loanFeeField = embedFields.find(f => f.name.includes('Kiralık Bedeli'));
            const oldClubField = embedFields.find(f => f.name.includes('Eski Kulüp'));
            const newClubField = embedFields.find(f => f.name.includes('Yeni Kulüp'));
            const salaryField = embedFields.find(f => f.name.includes('Maaş'));
            const durationField = embedFields.find(f => f.name.includes('Sözleşme'));
            
            const loanFee = loanFeeField ? loanFeeField.value : 'Belirtilmemiş';
            const oldClub = oldClubField ? oldClubField.value : 'Belirtilmemiş';
            const newClub = newClubField ? newClubField.value : 'Belirtilmemiş';
            const salary = salaryField ? salaryField.value : 'Belirtilmemiş';
            const duration = durationField ? durationField.value : 'Belirtilmemiş';
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Kiralık Anlaşması Tamamlandı!')
                .setDescription(`${player.user} kiralık olarak kulüp değiştirdi!\n\n${oldClub} ➤ ${newClub}`)
                .addFields(
                    { name: '⚽ Oyuncu', value: `${player.user}`, inline: true },
                    { name: '🏆 Eski Kulüp', value: oldClub, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: newClub, inline: true },
                    { name: '💰 Kiralık Ücreti', value: `${loanFee}€`, inline: true },
                    { name: '💸 Yıllık Maaş', value: `${salary}€`, inline: true },
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
            const team = teamField ? teamField.value : `${president.user}`;
            
            announcementEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Gerçekleşti!')
                .addFields(
                    { name: '⚽ Oyuncu', value: `${player.user}`, inline: true },
                    { name: '🏟️ Yeni Kulüp', value: team, inline: true },
                    { name: '💰 Maaş', value: `${salary}€`, inline: true },
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
                
                // Send to global log
                const globalLogger = require('../utils/globalLogger');
                const logData = {
                    player: transferData.player ? transferData.player.user.username : 'Bilinmiyor',
                    fromTeam: null,
                    toTeam: null,
                    amount: null,
                    salary: null,
                    duration: null,
                    reason: null
                };

                // Extract data based on transfer type - use actual team names from forms
                if (transferData.type === 'trade') {
                    logData.player = `${transferData.wantedPlayer.user.username} ↔ ${transferData.givenPlayer.user.username}`;
                    // Use actual club names from the trade announcement
                    const clubsField = announcementEmbed.fields.find(f => f.name.includes('Kulüpler'));
                    if (clubsField && clubsField.value.includes('↔')) {
                        const clubs = clubsField.value.split('↔');
                        logData.fromTeam = clubs[1]?.trim().replace(/nin takımı$/, '') || transferData.president.user.username;
                        logData.toTeam = clubs[0]?.trim().replace(/nin takımı$/, '') || transferData.targetPresident.user.username;
                    } else {
                        logData.fromTeam = transferData.targetPresident.user.username;
                        logData.toTeam = transferData.president.user.username;
                    }
                    if (transferData.tradeData) {
                        logData.amount = transferData.tradeData.additionalAmount;
                        logData.salary = `${transferData.tradeData.wantedPlayerSalary} / ${transferData.tradeData.givenPlayerSalary}`;
                    }
                } else if (transferData.type === 'offer') {
                    const embedFields = announcementEmbed.fields;
                    logData.fromTeam = 'Serbest'; // Free agent
                    logData.toTeam = embedFields.find(f => f.name.includes('Yeni Kulüp'))?.value || 'Bilinmiyor';
                    logData.salary = embedFields.find(f => f.name.includes('Maaş'))?.value || 'Bilinmiyor';
                    logData.duration = embedFields.find(f => f.name.includes('Sözleşme'))?.value || 'Bilinmiyor';
                } else if (transferData.type === 'contract' || transferData.type === 'hire') {
                    const embedFields = announcementEmbed.fields;
                    logData.fromTeam = embedFields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Bilinmiyor';
                    logData.toTeam = embedFields.find(f => f.name.includes('Yeni Kulüp'))?.value || 'Bilinmiyor';
                    logData.amount = embedFields.find(f => f.name.includes('Transfer Bedeli') || f.name.includes('Kiralık'))?.value || 'Bilinmiyor';
                    logData.salary = embedFields.find(f => f.name.includes('Maaş'))?.value || 'Bilinmiyor';
                    logData.duration = embedFields.find(f => f.name.includes('Sözleşme'))?.value || 'Bilinmiyor';
                }

                const transferTypeMap = {
                    'offer': 'Serbest Transfer',
                    'contract': 'Sözleşme Transferi',
                    'trade': 'Takas',
                    'hire': 'Kiralık Transfer'
                };

                await globalLogger.logTransfer(
                    channelToUse.client, 
                    transferTypeMap[transferData.type] || 'Transfer',
                    guild.name, 
                    logData
                );

                // Save transfer to local tracking system
                this.saveTransferRecord(guild, transferData, logData);
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
            .setDescription(`${player} serbest futbolcu oldu!`)
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

        // Send to global log
        await globalLogger.logFreeAgent(
            freeAgentChannel.client,
            guild.name,
            {
                player: player.username,
                oldClub: releaseData.oldClub || 'Belirtilmemiş',
                reason: releaseData.reason || 'Belirtilmemiş',
                compensation: releaseData.compensation || 'Yok'
            }
        );
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
        } else if (type === 'brelease') {
            // For brelease: [modal, playerId, presidentId, releaseType] - playerId is at index 1 (player who initiated)
            commandCreatorId = additionalParams[1];
        } else if (type === 'contract') {
            // For contract: [modal, targetPresidentId, playerId, presidentId] - presidentId is at index 3
            commandCreatorId = additionalParams[3];
        } else if (type === 'trade') {
            // For trade: [modal, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] - presidentId is at index 4
            commandCreatorId = additionalParams[4];
        } else if (type === 'hire') {
            // For hire: [modal, targetPresidentId, playerId, presidentId] - presidentId is at index 3
            commandCreatorId = additionalParams[3];
        } else {
            // For offer: [modal, targetId, presidentId] - presidentId is at index 2
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
                    // Defer interaction first to prevent timeout
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }
                    
                    // Instead of showing modal immediately, create a form in the channel
                    await this.createTradeFormInChannel(client, interaction, additionalParams.slice(1));
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
            case 'bduyur':
                if (additionalParams[0] === 'modal') {
                    // Check interaction state before showing modal
                    if (interaction.replied || interaction.deferred) {
                        console.log('Interaction already replied/deferred, cannot show modal');
                        return;
                    }
                    
                    await this.handleShowBduyurForm(client, interaction, additionalParams.slice(1));
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
            salary: fields.find(f => f.name.includes('Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme+Ek Madde'))?.value || '',
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
        
        // Extract existing data from embed fields using exact field names
        const existingData = {
            transferFee: fields.find(f => f.name.includes('Transfer Bedeli'))?.value || '',
            oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
            newClub: fields.find(f => f.name.includes('Yeni Kulüp'))?.value || '',
            salary: fields.find(f => f.name.includes('Yıllık Maaş'))?.value || '',
            contractDuration: fields.find(f => f.name.includes('Sözleşme+Ekmadde'))?.value || ''
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

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme+Ek Madde')
            .setStyle('SHORT')
            .setValue(existingData.contractDuration)
            .setRequired(true);

        modal.addComponents(
            new MessageActionRow().addComponents(loanFeeInput),
            new MessageActionRow().addComponents(oldClubInput),
            new MessageActionRow().addComponents(newClubInput),
            new MessageActionRow().addComponents(salaryInput),
            new MessageActionRow().addComponents(contractInput)
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
        try {
            // Check if interaction is already replied or deferred
            if (interaction.replied || interaction.deferred) {
                console.log('Interaction already processed, cannot show modal');
                return;
            }

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

            const salaryInput = new TextInputComponent()
                .setCustomId('salary')
                .setLabel('Maaş (Yıllık)')
                .setStyle('SHORT')
                .setPlaceholder('Örn: 6M, 500k, 1.2B')
                .setRequired(true);

            const contractInput = new TextInputComponent()
                .setCustomId('contract_duration')
                .setLabel('Sözleşme+Ek Madde')
                .setStyle('SHORT')
                .setPlaceholder('Örn: 2 yıl + bonuslar')
                .setRequired(true);

            const bonusInput = new TextInputComponent()
                .setCustomId('bonus')
                .setLabel('İmza Bonusu')
                .setStyle('SHORT')
                .setPlaceholder('Örn: 3M, 200k, 500M')
                .setRequired(false);

            const row1 = new MessageActionRow().addComponents(newTeamInput);
            const row2 = new MessageActionRow().addComponents(salaryInput);
            const row3 = new MessageActionRow().addComponents(contractInput);
            const row4 = new MessageActionRow().addComponents(bonusInput);

            modal.addComponents(row1, row2, row3, row4);

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing offer modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Modal gösterilirken hata oluştu! Lütfen tekrar deneyin.',
                    ephemeral: true
                });
            }
        }
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
            .setPlaceholder('Örn: 15M, 500k, 2B')
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
            .setPlaceholder('Örn: 8M, 500k, 1.2B')
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

        try {
            // Check if interaction is still valid
            if (interaction.deferred || interaction.replied) {
                console.log('Interaction already handled, cannot show modal');
                return;
            }
            
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Modal gösterme hatası:', error);
            if (!interaction.deferred && !interaction.replied) {
                try {
                    await interaction.reply({ 
                        content: '❌ Modal açılırken hata oluştu! Lütfen tekrar deneyin.', 
                        ephemeral: true 
                    });
                } catch (replyError) {
                    console.error('Reply error:', replyError);
                }
            }
        }
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
            .setPlaceholder('Örn: 5M, 200k, 1B')
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
            .setPlaceholder('Örn: 10M, 500k, 1.5B')
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
        try {
            const [targetPresidentId, playerId, presidentId] = params;
            console.log('HandleShowHireForm received params:', params);
            console.log('Parsed hire params:', { targetPresidentId, playerId, presidentId });
            
            const modal = new Modal()
                .setCustomId(`hire_form_${targetPresidentId}_${playerId}_${presidentId}`)
                .setTitle('Kiralık Teklifi Formu');

        const loanFeeInput = new TextInputComponent()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2M, 500k, 1.5B')
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
            .setPlaceholder('Örn: 8M, 500k, 1.2B')
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
        } catch (error) {
            console.error('Error showing hire modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Modal form açılırken bir hata oluştu!',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            }
        }
    }



    async createTradeFormInChannel(client, interaction, params) {
        const [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        try {
            const guild = interaction.guild;
            const targetPresident = await guild.members.fetch(targetPresidentId);
            const wantedPlayer = await guild.members.fetch(wantedPlayerId);
            const givenPlayer = await guild.members.fetch(givenPlayerId);
            const president = await guild.members.fetch(presidentId);

            // Create trade form with modal button
            const tradeData = {
                additionalAmount: 'Belirtilmedi',
                bonus: 'Belirtilmedi', 
                contractDuration: 'Belirtilecek'
            };

            const tradeEmbed = embeds.createTradeForm(president.user, targetPresident.user, wantedPlayer.user, tradeData);
            tradeEmbed.addFields(
                { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true }
            );
            
            const formButton = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`trade_fill_form_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                        .setLabel('Formu Doldur')
                        .setStyle('PRIMARY')
                        .setEmoji('📝')
                );

            await interaction.editReply({
                content: '✅ Takas formu hazırlandı. Lütfen "Formu Doldur" butonuna tıklayarak detayları girin.',
                embeds: [tradeEmbed],
                components: [formButton]
            });
        } catch (error) {
            console.error('Error creating trade form:', error);
            await interaction.editReply({
                content: '❌ Takas formu oluşturulurken hata oluştu!'
            });
        }
    }

    async handleTradeFillForm(client, interaction, params) {
        const [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        try {
            // Check if interaction is still valid before showing modal
            if (interaction.replied || interaction.deferred) {
                console.log('Interaction already handled, cannot show modal');
                return;
            }

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
            console.log('Trade fill form modal shown successfully');
        } catch (error) {
            console.error('Error showing trade fill form modal:', error);
            // Don't try to reply if interaction has already been handled
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: 'Modal açılırken hata oluştu!',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            }
        }
    }

    async showEditTradePresidentModal(client, interaction, targetPresidentId, wantedPlayerId, givenPlayerId, presidentId) {
        try {
            // Get current embed data to pre-fill the modal
            const embed = interaction.message.embeds[0];
            let currentAdditionalAmount = 'Belirtilmedi';
            let currentBonus = 'Belirtilmedi';
            let currentContract = 'Belirtilecek';
            
            if (embed && embed.fields) {
                const additionalField = embed.fields.find(f => f.name.includes('Ek Miktar'));
                const bonusField = embed.fields.find(f => f.name.includes('Özellikleri') || f.name.includes('Bonus'));
                const contractField = embed.fields.find(f => f.name.includes('Sözleşme'));
                
                if (additionalField && additionalField.value !== 'Belirtilmedi') currentAdditionalAmount = additionalField.value;
                if (bonusField && bonusField.value !== 'Belirtilmedi') currentBonus = bonusField.value;
                if (contractField && contractField.value !== 'Belirtilecek') currentContract = contractField.value;
            }

            const modal = new Modal()
                .setCustomId(`trade_form_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                .setTitle('Takas Teklifi Düzenle');

            const additionalAmountInput = new TextInputComponent()
                .setCustomId('additional_amount')
                .setLabel('Ek Miktar')
                .setStyle('SHORT')
                .setPlaceholder('Örn: 5.000.000₺')
                .setValue(currentAdditionalAmount === 'Belirtilmedi' ? '' : currentAdditionalAmount)
                .setRequired(false);

            const bonusInput = new TextInputComponent()
                .setCustomId('bonus')
                .setLabel('İstenen Oyuncu Özellikleri')
                .setStyle('SHORT')
                .setPlaceholder('Örn: Mevki, yaş, özellikler')
                .setValue(currentBonus === 'Belirtilmedi' ? '' : currentBonus)
                .setRequired(false);

            const contractInput = new TextInputComponent()
                .setCustomId('contract_duration')
                .setLabel('Sözleşme+Ek Madde')
                .setStyle('SHORT')
                .setPlaceholder('Örn: 2 yıl + performans bonusu')
                .setValue(currentContract === 'Belirtilecek' ? '' : currentContract)
                .setRequired(true);

            const row1 = new MessageActionRow().addComponents(additionalAmountInput);
            const row2 = new MessageActionRow().addComponents(bonusInput);
            const row3 = new MessageActionRow().addComponents(contractInput);

            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing trade president edit modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Modal açılırken hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }

    async handleShowTradeForm(client, interaction, params) {
        const [targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = params;
        
        try {
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

            const row1 = new MessageActionRow().addComponents(additionalAmountInput);
            const row2 = new MessageActionRow().addComponents(bonusInput);

            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing trade modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Modal açılırken hata oluştu!',
                    ephemeral: true
                });
            }
        }
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
            .setPlaceholder('Örn: 15M, 800k, 2B')
            .setRequired(true);

        const givenPlayerSalaryInput = new TextInputComponent()
            .setCustomId('given_player_salary')
            .setLabel('Verilecek Oyuncunun Maaşı')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 10M, 600k, 1.8B')
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
            .setLabel('kaç stat kasarım')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 100 stat, 200 stat, günde 50 stat, vs.')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş Beklentim')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 5M, 800k, 1.2B')
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
            .setPlaceholder('Örn: 500k, 1M, 2.5B')
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

            // Extract trade data from the embed to pass to announcement
            const embed = interaction.message.embeds[0];
            const fields = embed ? embed.fields : [];
            
            const tradeData = {
                wantedPlayerSalary: fields.find(f => f.name.includes('İstenen Oyuncunun Maaşı'))?.value || 'Belirtilmemiş',
                givenPlayerSalary: fields.find(f => f.name.includes('Verilecek Oyuncunun Maaşı'))?.value || 'Belirtilmemiş',
                wantedPlayerContract: fields.find(f => f.name.includes('İstenen Oyuncunun Sözleşme'))?.value || 'Belirtilmemiş',
                givenPlayerContract: fields.find(f => f.name.includes('Verilecek Oyuncunun Sözleşme'))?.value || 'Belirtilmemiş',
                additionalAmount: fields.find(f => f.name.includes('Ek Miktar') || f.name.includes('💰 Ek Miktar'))?.value || 'Yok',
                bonus: fields.find(f => f.name.includes('Bonus') || f.name.includes('Özellikleri') || f.name.includes('🎁'))?.value || 'Yok',
                contractDuration: fields.find(f => f.name.includes('Sözleşme+Ek Madde') || f.name.includes('📅 Sözleşme'))?.value || 'Belirtilmemiş'
            };

            console.log('📊 Trade data extracted for announcement:', tradeData);

            // Transfer tracker - mark both players as transferred
            transferTracker.markPlayerAsTransferred(guild.id, wantedPlayerId, 'trade');
            transferTracker.markPlayerAsTransferred(guild.id, givenPlayerId, 'trade');
            console.log(`🔄 Her iki oyuncu transfer olarak işaretlendi: ${wantedPlayer.displayName} ve ${givenPlayer.displayName} (trade)`);

            // Send transfer announcement with complete trade data
            await this.sendTransferAnnouncement(guild, {
                type: 'trade',
                wantedPlayer,
                givenPlayer,
                targetPresident,
                president,
                tradeData,
                embed: { fields }
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
            }, 5000);

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
                .setDescription(`${wantedPlayer.user} ↔ ${givenPlayer.user}`)
                .addFields(
                    { name: '🏟️ Kulüpler', value: `${targetPresident.user}'nin takımı ↔ ${president.user}'nin takımı`, inline: false },
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
        
        // Handle btrelease confirm/cancel buttons for unilateral termination
        if (buttonType === 'confirm') {
            if (interaction.replied || interaction.deferred) {
                return;
            }

            // Only the player who initiated can confirm their own termination
            const isAuthorized = interaction.user.id === playerId;
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
                // Automatic role management: Remove futbolcu role, add serbest futbolcu role, remove unilateral termination role
                console.log(`BTRelease: Converting ${player.displayName} to free agent and cleaning up roles...`);
                const result = await permissions.makePlayerFree(player);
                console.log(`BTRelease role management result: ${result}`);
                
                if (result) {
                    console.log(`✅ BTRelease: Successfully updated roles for ${player.displayName}`);
                } else {
                    console.log(`❌ BTRelease: Failed to update roles for ${player.displayName}`);
                }

                const channels = require('../utils/channels');
                await channels.createFreeAgentAnnouncement(guild, player, 'Tek taraflı fesih');

                await interaction.editReply(`✅ ${player.user} sözleşmesini tek taraflı feshetti ve serbest futbolcu oldu! Roller güncellendi.`);
            } catch (error) {
                console.error('❌ BTRelease onaylama hatası:', error);
                console.error('❌ BTRelease button error stack:', error.stack);
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
            // Only the player who initiated can cancel their own termination
            const isAuthorized = interaction.user.id === playerId;
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
        // For brelease: playerId is the president who should accept, presidentId is the player who initiated
        const president = await guild.members.fetch(playerId); // President who should accept
        const player = await guild.members.fetch(presidentId); // Player who initiated
        
        if (!player || !president) {
            return interaction.reply({
                content: '❌ Kullanıcılar bulunamadı!',
                ephemeral: true
            });
        }

        // Authorization checks - for brelease workflow
        console.log('BRelease authorization check:', {
            buttonType,
            userId: interaction.user.id,
            playerId, // This should be the president
            presidentId, // This should be the player who initiated
            playerName: player.displayName,
            presidentName: president.displayName
        });
        
        if (buttonType === 'accept' || buttonType === 'reject') {
            // For accept/reject: only the president (playerId) should be able to accept
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Bu fesih teklifini sadece etiketlenen başkan kabul edebilir veya reddedebilir!',
                    ephemeral: true
                });
            }
        } else if (buttonType === 'edit') {
            // For edit: only the player who initiated (presidentId) should be able to edit
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Bu butonu sadece fesih talebini yapan oyuncu kullanabilir!',
                    ephemeral: true
                });
            }
            
            // Show edit modal directly without deferring
            return this.showEditBreleaseModal(client, interaction, presidentId, playerId, releaseType);
        }

        // Only defer reply for accept/reject buttons, not edit buttons (which show modals)
        if (buttonType === 'accept' || buttonType === 'reject') {
            await interaction.deferReply();
        }

        if (buttonType === 'accept') {
            try {
                // For brelease: player is the one who gets released (presidentId is actually the player)
                const playerToRelease = await guild.members.fetch(presidentId);
                
                // Automatic role management: Remove futbolcu role, add serbest futbolcu role
                console.log(`BRelease: Converting ${playerToRelease.displayName} to free agent...`);
                const result = await permissions.makePlayerFree(playerToRelease);
                console.log(`BRelease role management result: ${result}`);
                
                if (result) {
                    console.log(`✅ BRelease: Successfully updated roles for ${playerToRelease.displayName}`);
                } else {
                    console.log(`❌ BRelease: Failed to update roles for ${playerToRelease.displayName}`);
                }

                // Extract form data from embed to use in announcement
                const embed = interaction.message.embeds[0];
                const fields = embed.fields;
                const releaseData = {
                    oldClub: fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
                    reason: fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
                    compensation: fields.find(f => f.name.includes('Tazminat'))?.value || '',
                    newTeam: fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
                };

                // Check if compensation is required
                const compensationAmount = releaseData.compensation?.trim();
                if (compensationAmount && compensationAmount.toLowerCase() !== 'yok' && compensationAmount !== '') {
                    // Economy manager for automatic compensation payment
                    const EconomyManager = require('../utils/economy');
                    const economy = new EconomyManager();
                    
                    // Parse compensation amount
                    const compensationValue = economy.parseAmount(compensationAmount);
                    
                    // Check if president has enough money (playerId in brelease is the president)
                    const presidentData = economy.getUserData(guild.id, playerId);
                    const presidentBalance = presidentData.cash;
                    
                    if (presidentBalance < compensationValue) {
                        await interaction.editReply({
                            content: `❌ **Fesih İptal!** ${president} yeterli bakiye yok!\n**Gerekli tazminat:** ${economy.formatAmount(compensationValue)}\n**Mevcut bakiye:** ${economy.formatAmount(presidentBalance)}`
                        });
                        
                        // Delete channel after 5 seconds
                        setTimeout(async () => {
                            try {
                                if (interaction.channel && interaction.channel.deletable) {
                                    await interaction.channel.delete("Fesih iptal - Yetersiz bakiye");
                                }
                            } catch (error) {
                                console.error('Channel deletion error:', error);
                            }
                        }, 5000);
                        return;
                    }
                    
                    // Automatic compensation payment (president pays player)
                    const payment = economy.transferMoney(guild.id, playerId, presidentId, compensationValue);
                    if (!payment.success) {
                        await interaction.editReply({
                            content: `❌ **Fesih İptal!** Tazminat ödemesi başarısız: ${payment.message}`
                        });
                        
                        // Delete channel after 5 seconds
                        setTimeout(async () => {
                            try {
                                if (interaction.channel && interaction.channel.deletable) {
                                    await interaction.channel.delete("Fesih iptal - Ödeme hatası");
                                }
                            } catch (error) {
                                console.error('Channel deletion error:', error);
                            }
                        }, 5000);
                        return;
                    }
                    
                    // Send automatic payment confirmation
                    await interaction.editReply({
                        content: `✅ **Karşılıklı Fesih Kabul Edildi!**\n\n**Otomatik Tazminat Ödemesi:**\n💰 ${economy.formatAmount(compensationValue)} → ${playerToRelease.user}\n\n${president} tarafından otomatik olarak ödendi!`
                    });
                    
                    // Continue with release process
                    const channels = require('../utils/channels');
                    await channels.createFreeAgentAnnouncement(guild, playerToRelease, releaseData.reason, releaseData);
                    
                    // Delete channel after 5 seconds
                    setTimeout(async () => {
                        try {
                            if (interaction.channel && interaction.channel.deletable) {
                                await interaction.channel.delete("Karşılıklı fesih tamamlandı - Otomatik tazminat ödendi");
                            }
                        } catch (error) {
                            console.error('Channel deletion error:', error);
                        }
                    }, 5000);
                    return;

                } else {
                    // No compensation required - complete release immediately
                    const channels = require('../utils/channels');
                    await channels.createFreeAgentAnnouncement(guild, playerToRelease, releaseData.reason, releaseData);

                    await interaction.editReply(`✅ ${playerToRelease.user} ile karşılıklı fesih tamamlandı! Oyuncu serbest futbolcu oldu ve roller güncellendi.`);
                    
                    // Complete release immediately with channel deletion
                    setTimeout(async () => {
                        try {
                            if (interaction.channel && interaction.channel.deletable) {
                                await interaction.channel.delete('Karşılıklı fesih tamamlandı');
                            }
                        } catch (error) {
                            console.error('Kanal silme hatası:', error);
                        }
                    }, 5000);
                }
            } catch (error) {
                console.error('❌ BRelease kabul hatası:', error);
                console.error('❌ BRelease button error stack:', error.stack);
                try {
                    await interaction.editReply('❌ Fesih işlemi tamamlanırken bir hata oluştu!');
                } catch (replyError) {
                    console.error('❌ Could not send error reply:', replyError);
                }
            }

        } else if (buttonType === 'reject') {
            // For brelease: playerId is the president who is rejecting, presidentId is the player who requested
            const playerWhoRequested = await guild.members.fetch(presidentId);
            await interaction.editReply(`❌ ${president.user} ${playerWhoRequested.user}'nin fesih teklifini reddetti.`);
            
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.deletable) {
                        await interaction.channel.delete('Fesih teklifi reddedildi');
                    }
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                }
            }, 5000);

        } else if (buttonType === 'edit') {
            // Authorization already checked above, just show modal
            await this.showEditBreleaseModal(client, interaction, presidentId, playerId, releaseType);
            return;
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
        // Authorization check - only the player who initiated can edit
        if (interaction.user.id !== presidentId) {
            return interaction.reply({
                content: '❌ Bu butonu sadece fesih talebini yapan oyuncu kullanabilir!',
                ephemeral: true
            });
        }
        
        try {
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
        } catch (error) {
            console.error('BRelease edit modal error:', error);
            if (error.code === 'INTERACTION_ALREADY_REPLIED') {
                console.log('BRelease interaction already replied, cannot show modal');
                return;
            }
            // Try to reply with error if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Modal açılırken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Could not send error reply:', replyError);
            }
        }
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
            .setPlaceholder('Örn: 500k, 1M, 2B')
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

    async handleShowBduyurForm(client, interaction, params) {
        const [playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`bduyur_modal_${playerId}_${presidentId}`)
            .setTitle('Transfer Listesi Formu');

        const transferTypeInput = new TextInputComponent()
            .setCustomId('transfer_type')
            .setLabel('Transfer Türü')
            .setStyle('SHORT')
            .setPlaceholder('kiralık / bonservis / zorunlu / opsiyonlu')
            .setRequired(true);

        const statInput = new TextInputComponent()
            .setCustomId('stat_amount')
            .setLabel('Stat Miktarı')
            .setStyle('SHORT')
            .setPlaceholder('100 stat, 200 stat, günde 50 stat')
            .setRequired(true);

        const playerSalaryInput = new TextInputComponent()
            .setCustomId('player_salary')
            .setLabel('Oyuncumun Maaşı')
            .setStyle('SHORT')
            .setPlaceholder('500M, 1B, 2B')
            .setRequired(true);

        const expectedPriceInput = new TextInputComponent()
            .setCustomId('expected_price')
            .setLabel('Beklenen Ücret')
            .setStyle('SHORT')
            .setPlaceholder('1B, 2B, 5B')
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonus')
            .setStyle('SHORT')
            .setPlaceholder('İmza bonusu, performans bonusu')
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(transferTypeInput),
            new MessageActionRow().addComponents(statInput),
            new MessageActionRow().addComponents(playerSalaryInput),
            new MessageActionRow().addComponents(expectedPriceInput),
            new MessageActionRow().addComponents(bonusInput)
        );

        try {
            // Check if interaction is still valid before showing modal
            if (interaction.replied || interaction.deferred) {
                console.log('Cannot show modal - interaction already processed');
                return;
            }
            
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Modal show error:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ content: '❌ Modal açılırken hata oluştu!', ephemeral: true });
                } catch (replyError) {
                    console.error('Could not send error reply:', replyError);
                }
            }
        }
    }

    async handleBduyurButton(client, interaction, params) {
        try {
            const [buttonType, playerId, presidentId] = params;
            
            // Only defer for accept/reject, not edit (edit shows modal)
            if (buttonType !== 'edit') {
                await interaction.deferReply();
            }
            const guild = interaction.guild;
            const player = await guild.members.fetch(playerId);
            const president = await guild.members.fetch(presidentId);

            console.log('BDuyur button handling:', { buttonType, playerId, presidentId });

            if (buttonType === 'accept') {
            // Player or transfer authorities can accept
            const PermissionManager = require('../utils/permissions');
            const permissions = new PermissionManager();
            const isPlayer = interaction.user.id === playerId;
            const isTransferAuthority = permissions.isTransferAuthority(interaction.member);
            
            if (!isPlayer && !isTransferAuthority) {
                return interaction.editReply({
                    content: '❌ Sadece transfer listesine konulan oyuncu veya transfer yetkilileri kabul edebilir!'
                });
            }

            // Extract bduyur data from embed fields for announcement
            const embed = interaction.message.embeds[0];
            const fields = embed.fields;
            
            console.log('Embed fields for extraction:', fields.map(f => ({ name: f.name, value: f.value })));
            
            const bduyurData = {
                transferType: fields.find(f => f.name.includes('Transfer Türü'))?.value || 'Belirtilmemiş',
                statAmount: fields.find(f => f.name.includes('Stat Miktarı'))?.value || 'Belirtilmemiş',
                playerSalary: fields.find(f => f.name.includes('Oyuncumun Maaşı'))?.value || 'Belirtilmemiş',
                expectedPrice: fields.find(f => f.name.includes('Beklenen Ücret'))?.value || 'Belirtilmemiş',
                bonus: fields.find(f => f.name.includes('Bonus'))?.value || 'Belirtilmemiş'
            };
            
            console.log('Extracted bduyur data:', bduyurData);

            // Send to bduyur channel
            console.log('BDuyur accept button - calling sendBduyurAnnouncement...');
            await this.sendBduyurAnnouncement(guild, player, president, bduyurData);
            console.log('BDuyur accept button - sendBduyurAnnouncement completed');

            await interaction.editReply(`✅ ${player.user} transfer listesi kabul edildi ve duyuruldu!`);

            // Disable buttons
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

            // Delete channel after 5 seconds
            setTimeout(async () => {
                try {
                    await interaction.followUp('⏱️ Kanal 3 saniye sonra silinecek...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await interaction.followUp('⏱️ Kanal 1 saniye sonra silinecek...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (interaction.channel.deletable) {
                        await interaction.channel.delete('Transfer listesi kabul edildi');
                    }
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                }
            }, 5000);

        } else if (buttonType === 'reject') {
            await interaction.editReply(`❌ Transfer listesi talebi reddedildi.`);

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

            // Delete channel after 5 seconds
            setTimeout(async () => {
                try {
                    await interaction.followUp('⏱️ Kanal 3 saniye sonra silinecek...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await interaction.followUp('⏱️ Kanal 1 saniye sonra silinecek...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (interaction.channel.deletable) {
                        await interaction.channel.delete('Transfer listesi reddedildi');
                    }
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                }
            }, 5000);

        } else if (buttonType === 'edit') {
            // Only the president can edit their transfer list proposal
            const isAuthorized = interaction.user.id === presidentId;
            if (!isAuthorized) {
                return interaction.reply({
                    content: '❌ Bu butonu sadece transfer listesini oluşturan başkan kullanabilir!',
                    ephemeral: true
                });
            }

            // Check if interaction is still valid before showing modal
            if (interaction.replied || interaction.deferred) {
                console.log('Cannot show edit modal - interaction already processed');
                return;
            }

            await this.showEditBduyurModal(client, interaction, playerId, presidentId);
        }
        
        } catch (error) {
            console.error('BDuyur button error:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Bir hata oluştu!', ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ Bir hata oluştu!' });
                }
            } catch (replyError) {
                console.error('Could not send error reply:', replyError);
            }
        }
    }

    async showEditBduyurModal(client, interaction, playerId, presidentId) {
        const embed = interaction.message.embeds[0];
        const fields = embed.fields;
        
        // Extract existing data from embed fields using new field names
        const existingData = {
            transferType: fields.find(f => f.name.includes('Transfer Türü'))?.value || '',
            statAmount: fields.find(f => f.name.includes('Stat Miktarı'))?.value || '',
            playerSalary: fields.find(f => f.name.includes('Oyuncumun Maaşı'))?.value || '',
            expectedPrice: fields.find(f => f.name.includes('Beklenen Ücret'))?.value || '',
            bonus: fields.find(f => f.name.includes('Bonus'))?.value || ''
        };

        const modal = new Modal()
            .setCustomId(`bduyur_modal_${playerId}_${presidentId}`)
            .setTitle('Transfer Listesi Düzenle');

        const transferTypeInput = new TextInputComponent()
            .setCustomId('transfer_type')
            .setLabel('Transfer Türü')
            .setStyle('SHORT')
            .setValue(existingData.transferType)
            .setRequired(true);

        const statInput = new TextInputComponent()
            .setCustomId('stat_amount')
            .setLabel('Stat Miktarı')
            .setStyle('SHORT')
            .setValue(existingData.statAmount)
            .setRequired(true);

        const playerSalaryInput = new TextInputComponent()
            .setCustomId('player_salary')
            .setLabel('Oyuncumun Maaşı')
            .setStyle('SHORT')
            .setValue(existingData.playerSalary)
            .setRequired(true);

        const expectedPriceInput = new TextInputComponent()
            .setCustomId('expected_price')
            .setLabel('Beklenen Ücret')
            .setStyle('SHORT')
            .setValue(existingData.expectedPrice)
            .setRequired(true);

        const bonusInput = new TextInputComponent()
            .setCustomId('bonus')
            .setLabel('Bonus')
            .setStyle('SHORT')
            .setValue(existingData.bonus)
            .setRequired(false);

        modal.addComponents(
            new MessageActionRow().addComponents(transferTypeInput),
            new MessageActionRow().addComponents(statInput),
            new MessageActionRow().addComponents(playerSalaryInput),
            new MessageActionRow().addComponents(expectedPriceInput),
            new MessageActionRow().addComponents(bonusInput)
        );

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Edit modal show error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Modal açılırken hata oluştu!', ephemeral: true });
            }
        }
    }

    async sendBduyurAnnouncement(guild, player, president, bduyurData) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            console.log('BDuyur announcement starting for guild:', guild.id);
            
            // Get bduyur channel from roles.json
            const rolesFilePath = path.join(__dirname, '../data/roles.json');
            let bduyurChannelId = null;
            
            if (fs.existsSync(rolesFilePath)) {
                const rolesData = JSON.parse(fs.readFileSync(rolesFilePath, 'utf8'));
                console.log('Roles data:', JSON.stringify(rolesData, null, 2));
                bduyurChannelId = rolesData[guild.id]?.bduyurChannelId;
                console.log('BDuyur channel ID from roles.json:', bduyurChannelId);
            }

            if (!bduyurChannelId) {
                console.log('BDuyur kanalı ayarlanmamış - .bduyur-ayarla komutu kullanın');
                return;
            }

            const bduyurChannel = guild.channels.cache.get(bduyurChannelId);
            if (!bduyurChannel) {
                console.log('BDuyur kanalı bulunamadı, ID:', bduyurChannelId);
                return;
            }
            
            console.log('BDuyur channel found:', bduyurChannel.name);

            // Get bduyur ping role
            const rolesData = JSON.parse(fs.readFileSync(rolesFilePath, 'utf8'));
            const bduyurPingRoleId = rolesData[guild.id]?.bduyurPingRole;
            let mention = '';
            
            console.log('BDuyur ping role ID:', bduyurPingRoleId);
            
            if (bduyurPingRoleId) {
                const pingRole = guild.roles.cache.get(bduyurPingRoleId);
                if (pingRole) {
                    mention = `<@&${bduyurPingRoleId}> `;
                    console.log('BDuyur ping role found:', pingRole.name);
                } else {
                    console.log('BDuyur ping role not found in cache');
                }
            } else {
                console.log('BDuyur ping role not configured - .rol komutuyla ayarlayın');
            }

            const config = require('../config');
            const { MessageEmbed } = require('discord.js');
            const bduyurEmbed = new MessageEmbed()
                .setColor('#FFD700')
                .setTitle(`${config.emojis.football} Transfer Listesi`)
                .setDescription(`${president.user} tarafından ${player.user} transfer listesine kondu:\n\n**.contract ${president.user} ${player.user}** komutuyla iletişime geçin`)
                .addFields(
                    { name: '🎯 Oyuncu', value: `${player.user}`, inline: true },
                    { name: '🔄 Transfer Türü', value: bduyurData.transferType || 'Belirtilmemiş', inline: true },
                    { name: '📊 Stat Miktarı', value: bduyurData.statAmount || 'Belirtilmemiş', inline: true },
                    { name: '💰 Oyuncumun Maaşı', value: bduyurData.playerSalary || 'Belirtilmemiş', inline: true },
                    { name: '💎 Beklenen Ücret', value: bduyurData.expectedPrice || 'Belirtilmemiş', inline: true },
                    { name: '🎁 Bonus', value: bduyurData.bonus || 'Belirtilmemiş', inline: true }
                )
                .setThumbnail(player.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Listesi Sistemi' });

            console.log('Sending bduyur announcement...');
            
            await bduyurChannel.send({
                content: mention,
                embeds: [bduyurEmbed]
            });

            console.log('BDuyur duyurusu başarıyla gönderildi');

            // Send to global log
            const globalLogger = require('../utils/globalLogger');
            await globalLogger.logTransferList(
                bduyurChannel.client,
                guild.name,
                {
                    player: player.user.username,
                    president: `${president.user.username} (${president.displayName})`, // Include display name for team context
                    expectedFee: bduyurData.expectedPrice || 'Belirtilmemiş',
                    reason: bduyurData.transferType || 'Belirtilmemiş',
                    currentTeam: president.displayName, // Add current team info
                    playerSalary: bduyurData.playerSalary || 'Belirtilmemiş'
                }
            );

        } catch (error) {
            console.error('BDuyur duyuru gönderme hatası:', error);
        }
    }

    // TRelease modal form handler
    async handleShowTReleaseForm(client, interaction, params) {
        try {
            const [playerId, presidentId] = params;
            
            // Check authorization - only the command creator (president) can open the modal
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                    ephemeral: true
                });
            }

            const modal = new Modal()
                .setCustomId(`trelease_modal_${playerId}_${presidentId}`)
                .setTitle('Tek Taraflı Fesih Formu');

            const oldClubInput = new TextInputComponent()
                .setCustomId('old_club')
                .setLabel('Eski Kulüp')
                .setStyle('SHORT')
                .setPlaceholder('Oyuncunun eski kulübü')
                .setRequired(true);

            const reasonInput = new TextInputComponent()
                .setCustomId('reason')
                .setLabel('Fesih Nedeni')
                .setStyle('PARAGRAPH')
                .setPlaceholder('Tek taraflı fesih nedeni')
                .setRequired(true);

            const compensationInput = new TextInputComponent()
                .setCustomId('compensation')
                .setLabel('Tazminat')
                .setStyle('SHORT')
                .setPlaceholder('Tazminat miktarı (örn: 50,000€)')
                .setRequired(true);

            const newTeamInput = new TextInputComponent()
                .setCustomId('new_team')
                .setLabel('Yeni Takım')
                .setStyle('SHORT')
                .setPlaceholder('Oyuncunun gideceği takım (opsiyonel)')
                .setRequired(false);

            modal.addComponents(
                new MessageActionRow().addComponents(oldClubInput),
                new MessageActionRow().addComponents(reasonInput),
                new MessageActionRow().addComponents(compensationInput),
                new MessageActionRow().addComponents(newTeamInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error('TRelease modal error:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Modal açılırken hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }

    // BTRelease modal form handler
    // Save transfer record to local tracking system
    saveTransferRecord(guild, transferData, logData) {
        try {
            const fs = require('fs');
            const path = require('path');
            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            // Create data directory if it doesn't exist
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Load existing transfers
            let transfersData = {};
            if (fs.existsSync(transfersPath)) {
                transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            }

            // Initialize guild transfers if not exists
            if (!transfersData[guild.id]) {
                transfersData[guild.id] = [];
            }

            // Create transfer record with proper team name formatting
            const transferRecord = {
                player: logData.player,
                playerMention: transferData.player ? transferData.player.user.toString() : null,
                type: transferData.type,
                date: new Date().toLocaleString('tr-TR'),
                timestamp: Date.now()
            };

            // Handle different transfer types with proper team name formatting
            if (transferData.type === 'trade') {
                // Trade: Use president mentions with "nin takımı" format
                transferRecord.player = `${transferData.wantedPlayer?.user.username} ↔ ${transferData.givenPlayer?.user.username}`;
                transferRecord.fromTeam = `${transferData.targetPresident?.user.username}nin takımı`;
                transferRecord.toTeam = `${transferData.president?.user.username}nin takımı`;
                transferRecord.presidentMention = transferData.president?.user.toString() + "'nin";
                transferRecord.targetPresidentMention = transferData.targetPresident?.user.toString() + "'nin";
                transferRecord.tradeDetails = `${transferData.wantedPlayer?.user.username} ↔ ${transferData.givenPlayer?.user.username}`;
            } else if (transferData.type === 'offer') {
                // Offer: No old club for free agents, only new club
                transferRecord.fromTeam = null; // Don't show old club for offers
                transferRecord.toTeam = logData.toTeam;
            } else {
                // Contract, hire, etc: Show both old and new clubs
                transferRecord.fromTeam = logData.fromTeam;
                transferRecord.toTeam = logData.toTeam;
                transferRecord.reason = logData.reason;
            }

            // Add to guild transfers
            transfersData[guild.id].push(transferRecord);

            // Save to file
            fs.writeFileSync(transfersPath, JSON.stringify(transfersData, null, 2));
            
            console.log('Transfer kaydedildi:', transferRecord);
        } catch (error) {
            console.error('Transfer kaydetme hatası:', error);
        }
    }

    async handleShowBTReleaseForm(client, interaction, params) {
        try {
            const [playerId, ] = params;
            
            // Check authorization - only the command creator (player) can open the modal
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Bu butonu sadece komutu yazan kişi kullanabilir!',
                    ephemeral: true
                });
            }

            const modal = new Modal()
                .setCustomId(`btrelease_modal_${playerId}_${playerId}`)
                .setTitle('Tek Taraflı Fesih Formu');

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
                .setPlaceholder('Tek taraflı fesih nedeni')
                .setRequired(true);

            const compensationInput = new TextInputComponent()
                .setCustomId('compensation')
                .setLabel('Tazminat')
                .setStyle('SHORT')
                .setPlaceholder('Tazminat miktarı (örn: 50,000€)')
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
        } catch (error) {
            console.error('BTRelease modal error:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Modal açılirken hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }

    // TRelease button handler
    async handleTReleaseButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        
        try {
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

                await interaction.deferReply();

                // Role management for release - convert player to free agent
                try {
                    console.log(`🔄 TRelease: Starting role management for ${player.displayName}...`);
                    const result = await permissions.makePlayerFree(player);
                    console.log(`🔄 TRelease role management result: ${result}`);
                    
                    if (result) {
                        console.log(`✅ TRelease: Successfully updated roles for ${player.displayName}`);
                    } else {
                        console.log(`❌ TRelease: Failed to update roles for ${player.displayName}`);
                    }
                } catch (error) {
                    console.error('❌ Role management error in trelease:', error);
                }
                
                // Extract release data from embed fields
                const embed = interaction.message.embeds[0];
                const releaseData = {
                    oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş',
                    reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || 'Belirtilmemiş',
                    compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || 'Belirtilmemiş',
                    newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || 'Yok'
                };

                // Send to serbest-duyuru channel
                await this.sendReleaseTransferAnnouncement(guild, player, releaseData, 'tek_tarafli');

                await interaction.editReply({
                    content: `✅ Tek taraflı fesih kabul edildi! ${player.user} serbest futbolcu oldu ve rolleri güncellendi.`
                });

            } else if (buttonType === 'reject') {
                await interaction.deferReply();
                await interaction.editReply({
                    content: `❌ Tek taraflı fesih teklifi reddedildi!`
                });

            } else if (buttonType === 'edit') {
                // Check authorization - only the command creator (president) can edit
                if (interaction.user.id !== presidentId) {
                    return interaction.reply({
                        content: '❌ Sadece komutu yazan kişi düzenleyebilir!',
                        ephemeral: true
                    });
                }

                // Extract existing data from embed and show pre-filled modal
                const embed = interaction.message.embeds[0];
                const existingData = {
                    oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
                    reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
                    compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || '',
                    newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
                };

                const modal = new Modal()
                    .setCustomId(`trelease_modal_${playerId}_${presidentId}`)
                    .setTitle('Tek Taraflı Fesih Düzenle');

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
                return;
            }

            // Disable buttons after accept/reject
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

                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete('Tek taraflı fesih tamamlandı');
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
            }

        } catch (error) {
            console.error('TRelease button error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ İşlem sırasında hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }

    // BTRelease button handler
    async handleBTReleaseButton(client, interaction, params) {
        const [buttonType, playerId] = params;
        const guild = interaction.guild;
        
        try {
            const player = await guild.members.fetch(playerId);

            if (buttonType === 'confirm') {
                // Check if user is authorized (only the player who initiated)
                if (interaction.user.id !== playerId) {
                    return interaction.reply({
                        content: '❌ Sadece kendi feshinizi onaylayabilirsiniz!',
                        ephemeral: true
                    });
                }

                await interaction.deferReply();

                // Role management for release - convert player to free agent
                try {
                    await permissions.makePlayerFree(player);
                    console.log(`Converted ${player.displayName} to free agent via btrelease`);
                } catch (error) {
                    console.error('Role management error in btrelease:', error);
                }
                
                // Extract release data from embed fields
                const embed = interaction.message.embeds[0];
                const releaseData = {
                    oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || 'Belirtilmemiş',
                    reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || 'Belirtilmemiş',
                    compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || 'Belirtilmemiş',
                    newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || 'Yok'
                };

                // Send to serbest-duyuru channel
                await this.sendReleaseTransferAnnouncement(guild, player, releaseData, 'tek_tarafli_oyuncu');

                await interaction.editReply({
                    content: `✅ Tek taraflı fesih onaylandı! Serbest futbolcu oldunuz ve rolleriniz güncellendi.`
                });

            } else if (buttonType === 'cancel') {
                await interaction.deferReply();
                await interaction.editReply({
                    content: `❌ Tek taraflı fesih iptal edildi!`
                });

            } else if (buttonType === 'edit') {
                // Check authorization - only the command creator (player) can edit
                if (interaction.user.id !== playerId) {
                    return interaction.reply({
                        content: '❌ Sadece kendi feshinizi düzenleyebilirsiniz!',
                        ephemeral: true
                    });
                }

                // Extract existing data from embed and show pre-filled modal
                const embed = interaction.message.embeds[0];
                const existingData = {
                    oldClub: embed.fields.find(f => f.name.includes('Eski Kulüp'))?.value || '',
                    reason: embed.fields.find(f => f.name.includes('Fesih Nedeni'))?.value || '',
                    compensation: embed.fields.find(f => f.name.includes('Tazminat'))?.value || '',
                    newTeam: embed.fields.find(f => f.name.includes('Yeni Takım'))?.value || ''
                };

                const modal = new Modal()
                    .setCustomId(`btrelease_modal_${playerId}_${playerId}`)
                    .setTitle('Tek Taraflı Fesih Düzenle');

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
                return;
            }

            // Disable buttons after confirm/cancel
            if (buttonType === 'confirm' || buttonType === 'cancel') {
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

                // Delete channel after 5 seconds
                setTimeout(async () => {
                    try {
                        if (interaction.channel && interaction.channel.deletable) {
                            await interaction.channel.delete('Tek taraflı fesih tamamlandı');
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
            }

        } catch (error) {
            console.error('BTRelease button error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ İşlem sırasında hata oluştu!',
                    ephemeral: true
                });
            }
        }
    }

    async handleLeaderboardPagination(client, interaction, params) {
        try {
            const [direction, page] = params;
            const newPage = parseInt(page);
            
            await interaction.deferUpdate();
            
            const EconomyManager = require('../utils/economy');
            const economy = new EconomyManager();
            
            const leaderboard = economy.getLeaderboard(interaction.guild.id, newPage, 10);
            
            if (leaderboard.users.length === 0) {
                const embed = new MessageEmbed()
                    .setColor('#FF6600')
                    .setTitle('💰 Zenginlik Sıralaması')
                    .setDescription('Bu sayfada hiç kullanıcı yok!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed], components: [] });
            }

            const embed = new MessageEmbed()
                .setColor('#FFD700')
                .setTitle('💰 Zenginlik Sıralaması')
                .setDescription(`Sayfa ${leaderboard.currentPage}/${leaderboard.totalPages}`)
                .setTimestamp();

            let description = '';
            leaderboard.users.forEach((user, index) => {
                const rank = (leaderboard.currentPage - 1) * 10 + index + 1;
                let medal = '';
                
                if (rank === 1) medal = '🥇';
                else if (rank === 2) medal = '🥈';
                else if (rank === 3) medal = '🥉';
                else medal = `${rank}.`;

                description += `${medal} <@${user.userId}>\n`;
                description += `💵 Nakit: ${economy.formatAmount(user.cash)} | `;
                description += `🏦 Banka: ${economy.formatAmount(user.bank)}\n`;
                description += `💰 Toplam: **${economy.formatAmount(user.total)}**\n\n`;
            });

            embed.setDescription(description);

            // Update navigation buttons
            const components = [];
            if (leaderboard.totalPages > 1) {
                const row = new MessageActionRow();
                
                if (leaderboard.currentPage > 1) {
                    row.addComponents(
                        new MessageButton()
                            .setCustomId(`lb_prev_${leaderboard.currentPage - 1}`)
                            .setLabel('◀ Önceki')
                            .setStyle('SECONDARY')
                    );
                }

                if (leaderboard.currentPage < leaderboard.totalPages) {
                    row.addComponents(
                        new MessageButton()
                            .setCustomId(`lb_next_${leaderboard.currentPage + 1}`)
                            .setLabel('Sonraki ▶')
                            .setStyle('SECONDARY')
                    );
                }

                if (row.components.length > 0) {
                    components.push(row);
                }
            }

            const messageOptions = { embeds: [embed] };
            if (components.length > 0) {
                messageOptions.components = components;
            }

            await interaction.editReply(messageOptions);
            
        } catch (error) {
            console.error('Leaderboard pagination error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Sayfa değiştirme hatası!',
                    ephemeral: true
                });
            }
        }
    }
}

module.exports = ButtonHandler;