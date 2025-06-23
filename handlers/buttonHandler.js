const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
                case 'contract':
                    if (params[0] === 'player') {
                        await this.handleContractPlayerButton(client, interaction, params.slice(1));
                    } else {
                        await this.handleContractButton(client, interaction, params);
                    }
                    break;
                case 'show':
                    if (params[0] === 'offer' && params[1] === 'modal') {
                        await this.handleShowOfferModal(client, interaction, params.slice(2));
                    } else if (params[0] === 'contract' && params[1] === 'modal') {
                        await this.handleShowContractModal(client, interaction, params.slice(2));
                    } else if (params[0] === 'trade' && params[1] === 'modal') {
                        await this.handleShowTradeModal(client, interaction, params.slice(2));
                    } else if (params[0] === 'release' && params[1] === 'modal') {
                        await this.handleShowReleaseModal(client, interaction, params.slice(2));
                    } else if (params[0] === 'announcement' && params[1] === 'modal') {
                        await this.handleShowAnnouncementModal(client, interaction, params.slice(2));
                    } else if (params[0] === 'hire' && params[1] === 'modal') {
                        await this.handleShowHireModal(client, interaction, params.slice(2));
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
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: '❌ Bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }
    }

    async handleOfferButton(client, interaction, params) {
        // offer_accept_playerID_presidentID veya offer_reject_playerID_presidentID
        const [buttonType, playerId, presidentId] = params;
        const player = interaction.guild.members.cache.get(playerId);
        const president = interaction.guild.members.cache.get(presidentId);
        
        // Embed'den modal verilerini çıkar
        let offerData = {
            newTeam: president.displayName,
            oldClub: 'Belirtilmedi',
            salary: '6.000.000₺/yıl',
            contractDuration: '2 yıl',
            bonus: '3.000.000₺'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Yeni Kulüp')) {
                        offerData.newTeam = field.value !== 'Belirtilmedi' ? field.value : president.displayName;
                    } else if (field.name.includes('Maaş')) {
                        offerData.salary = field.value;
                    } else if (field.name.includes('Sözleşme Süresi')) {
                        offerData.contractDuration = field.value;
                    } else if (field.name.includes('Bonus')) {
                        offerData.bonus = field.value;
                    } else if (field.name.includes('Eski Kulüp')) {
                        offerData.oldClub = field.value;
                    }
                }
            }
        }

        if (!player || !president) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        switch (buttonType) {
            case 'accept':
                // Sadece futbolcu kabul edebilir
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Bu teklifi sadece futbolcu kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                // Futbolcu rollerini güncelle
                await permissions.signPlayer(player);

                const acceptEmbed = embeds.createSuccess(
                    'Teklif Kabul Edildi!',
                    `${player} tarafından ${president} kulübünün teklifi kabul edildi!\n\nTransfer işlemi tamamlandı. Hoş geldin! 🎉`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Otomatik transfer duyurusu gönder
                await this.sendTransferAnnouncement(interaction.guild, {
                    player: player.user,
                    team: offerData.newTeam,
                    type: 'serbest_transfer',
                    salary: offerData.salary,
                    bonus: offerData.bonus,
                    duration: offerData.contractDuration,
                    playerName: offerData.playerName
                });

                // Transfer geçmişine kaydet
                await api.logTransfer({
                    type: 'offer_accepted',
                    player: player.user.username,
                    from: 'Serbest',
                    to: president.displayName,
                    amount: 0
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Transfer tamamlandı');
                }, 5000);

                break;

            case 'edit':
                // Sadece başkan düzenleyebilir
                if (interaction.user.id !== presidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu teklifi sadece başkan düzenleyebilir!', 
                        ephemeral: true 
                    });
                }

                // Modal'ı tekrar göster
                const modal = new ModalBuilder()
                    .setCustomId(`offer_form_${playerId}_${presidentId}`)
                    .setTitle('Transfer Teklifi Düzenle');

                // Form alanları
                const newTeamInput = new TextInputBuilder()
                    .setCustomId('new_team')
                    .setLabel('Yeni Kulüp')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: Real Madrid')
                    .setRequired(false);

                const playerNameInput = new TextInputBuilder()
                    .setCustomId('player_name')
                    .setLabel('Oyuncu İsmi')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: Cristiano Ronaldo')
                    .setRequired(false);

                const salaryInput = new TextInputBuilder()
                    .setCustomId('salary')
                    .setLabel('Maaş')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: 6.000.000₺/yıl')
                    .setRequired(false);

                const contractDurationInput = new TextInputBuilder()
                    .setCustomId('contract_duration')
                    .setLabel('Sözleşme Süresi')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: 3 yıl')
                    .setRequired(false);

                const targetPlayerInput = new TextInputBuilder()
                    .setCustomId('target_player')
                    .setLabel('İstenen Oyuncu')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Örn: Lionel Messi')
                    .setRequired(false);

                // Action Row'lar oluştur
                const row1 = new ActionRowBuilder().addComponents(newTeamInput);
                const row2 = new ActionRowBuilder().addComponents(playerNameInput);
                const row3 = new ActionRowBuilder().addComponents(salaryInput);
                const row4 = new ActionRowBuilder().addComponents(contractDurationInput);
                const row5 = new ActionRowBuilder().addComponents(targetPlayerInput);

                modal.addComponents(row1, row2, row3, row4, row5);

                await interaction.showModal(modal);

                break;

            case 'reject':
                // Sadece futbolcu reddedebilir
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Bu teklifi sadece futbolcu reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Teklif Reddedildi',
                    `${player} tarafından ${president} kulübünün teklifi reddedildi.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Teklif reddedildi');
                }, 5000);

                break;

            case 'edit':
                // Sadece başkan düzenleyebilir
                if (interaction.user.id !== presidentId) {
                    return interaction.reply({ 
                        content: '❌ Teklifi sadece başkan düzenleyebilir!', 
                        ephemeral: true 
                    });
                }

                // Teklif düzenleme formu
                const editEmbed = new EmbedBuilder()
                    .setColor(config.colors.accent)
                    .setTitle(`${config.emojis.edit} Teklif Düzenleme`)
                    .setDescription(`${player} için yeni teklif şartlarını ayarlayın:`)
                    .addFields(
                        { name: '💰 Maaş (aylık)', value: '750.000₺', inline: true },
                        { name: '💎 İmza Parası', value: '1.500.000₺', inline: true },
                        { name: '📅 Sözleşme Süresi', value: '3 yıl', inline: true },
                        { name: '🎯 Bonuslar', value: 'Gol bonusu: 15.000₺\nAsist bonusu: 7.500₺', inline: false }
                    )
                    .setTimestamp();

                const editRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`offer_accept_${playerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`offer_reject_${playerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross),
                        new ButtonBuilder()
                            .setCustomId(`offer_edit_${playerId}_${presidentId}`)
                            .setLabel('Tekrar Düzenle')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(config.emojis.edit)
                    );

                await interaction.update({ 
                    content: `${config.emojis.football} **Güncellenmiş Transfer Teklifi**\n${player}, ${president} sizden güncellenmiş bir teklif var!`,
                    embeds: [editEmbed], 
                    components: [editRow] 
                });

                break;
        }
    }

    async handleContractButton(client, interaction, params) {
        // contract_accept_targetPresidentID_fromPresidentID_playerID
        const [buttonType, targetPresidentId, fromPresidentId, playerId] = params;
        
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        // Embed'den modal verilerini çıkar
        let contractData = {
            transferFee: '5.000.000₺',
            salary: '10.000.000₺/yıl',
            contractDuration: '4 yıl',
            bonus: '3.000.000₺'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Transfer Bedeli')) {
                        contractData.transferFee = field.value;
                    } else if (field.name.includes('Maaş')) {
                        contractData.salary = field.value;
                    } else if (field.name.includes('Sözleşme Süresi')) {
                        contractData.contractDuration = field.value;
                    } else if (field.name.includes('Bonuslar')) {
                        contractData.bonus = field.value;
                    }
                }
            }
        }

        switch (buttonType) {
            case 'accept':
                // Sadece hedef başkan kabul edebilir
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu teklifi sadece hedef başkan kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                // İlk kanalı sil
                await channels.deleteNegotiationChannel(interaction.channel, 'Başkan kabul etti');

                // Oyuncuyla yeni kanal oluştur
                const playerChannel = await channels.createNegotiationChannel(
                    interaction.guild,
                    fromPresident.user,
                    player.user,
                    'contract_player',
                    null
                );

                if (playerChannel) {
                    const playerEmbed = embeds.createContractForm(fromPresident.user, targetPresident.user, player.user, contractData);
                    playerEmbed.setTitle(`${config.emojis.contract} Sözleşme Onayı - Oyuncu Kararı`);
                    playerEmbed.setDescription(`**${player.user.username}**, ${fromPresident.displayName} takımının sözleşme teklifi kabul edildi!\n\nArtık kararı size kalmış. Bu teklifi kabul ediyor musunuz?`);

                    const playerRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`contract_player_accept_${playerId}_${fromPresidentId}_${targetPresidentId}`)
                                .setLabel('Kabul Et')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji(config.emojis.check),
                            new ButtonBuilder()
                                .setCustomId(`contract_player_reject_${playerId}_${fromPresidentId}_${targetPresidentId}`)
                                .setLabel('Reddet')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji(config.emojis.cross)
                        );

                    await playerChannel.send({
                        content: `${config.emojis.contract} **Son Karar Aşaması**\n${player}, ${fromPresident.displayName} takımının sözleşme teklifi sizin onayınızı bekliyor!`,
                        embeds: [playerEmbed],
                        components: [playerRow]
                    });

                    // Başarı mesajı gönder
                    const successEmbed = embeds.createSuccess(
                        'Sözleşme Başkan Tarafından Kabul Edildi!',
                        `${targetPresident.displayName} teklifi kabul etti!\n\n**Oyuncu Kanalı:** ${playerChannel}\n\nArtık ${player.user.username} son kararını verecek.`
                    );

                    await interaction.reply({ embeds: [successEmbed] });
                }

                break;

            case 'reject':
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu teklifi sadece hedef başkan reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Sözleşme Reddedildi',
                    `${player} için sözleşme teklifi reddedildi.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Sözleşme reddedildi');
                }, 5000);

                break;

            case 'edit':
                // Sadece teklif veren başkan düzenleyebilir
                if (interaction.user.id !== fromPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Teklifi sadece teklif veren başkan düzenleyebilir!', 
                        ephemeral: true 
                    });
                }

                // Sözleşme düzenleme formu
                const editEmbed = embeds.createContractForm(fromPresident.user, targetPresident.user, player.user);
                editEmbed.setTitle(`${config.emojis.edit} Güncellenmiş Sözleşme Teklifi`);
                editEmbed.setFields([
                    { name: '👑 Teklif Veren Başkan', value: `${fromPresident}`, inline: true },
                    { name: '👑 Hedef Başkan', value: `${targetPresident}`, inline: true },
                    { name: '⚽ Oyuncu', value: `${player}`, inline: true },
                    { name: '💰 Transfer Bedeli', value: '3.000.000₺', inline: true },
                    { name: '💵 Maaş Teklifi', value: '850.000₺/ay', inline: true },
                    { name: '📅 Sözleşme Süresi', value: '4 yıl', inline: true },
                    { name: '📋 Güncellenmiş Şartlar', value: '• Kiralama opsiyonu yok\n• Satış opsiyon bedeli: %25\n• Performans bonusları dahil', inline: false }
                ]);

                const editRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`contract_accept_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                            .setLabel('Kabul Et')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(config.emojis.check),
                        new ButtonBuilder()
                            .setCustomId(`contract_reject_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                            .setLabel('Reddet')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji(config.emojis.cross),
                        new ButtonBuilder()
                            .setCustomId(`contract_edit_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                            .setLabel('Tekrar Düzenle')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji(config.emojis.edit)
                    );

                await interaction.update({ 
                    content: `${config.emojis.contract} **Güncellenmiş Sözleşme Teklifi**\n${targetPresident}, ${fromPresident} sizden güncellenmiş bir sözleşme teklifi var!`,
                    embeds: [editEmbed], 
                    components: [editRow] 
                });

                break;
        }
    }

    async handleTradeButton(client, interaction, params) {
        // trade_accept_targetPresidentID_fromPresidentID_playerID
        const [buttonType, targetPresidentId, fromPresidentId, playerId] = params;
        
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        // Embed'den modal verilerini çıkar
        let tradeData = {
            playerName: player.displayName,
            additionalAmount: '0',
            salary: '10.000.000₺/yıl',
            contractDuration: '4 yıl',
            targetPlayer: 'Belirtilmedi'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Ek Miktar')) {
                        tradeData.additionalAmount = field.value;
                    } else if (field.name.includes('Maaş')) {
                        tradeData.salary = field.value;
                    } else if (field.name.includes('Sözleşme Süresi')) {
                        tradeData.contractDuration = field.value;
                    } else if (field.name.includes('İstenen Oyuncu')) {
                        tradeData.targetPlayer = field.value;
                    } else if (field.name.includes('Oyuncu') && field.value.includes('(') && field.value.includes(')')) {
                        const nameMatch = field.value.match(/\(([^)]+)\)/);
                        if (nameMatch) {
                            tradeData.playerName = nameMatch[1];
                        }
                    }
                }
            }
        }

        switch (buttonType) {
            case 'accept':
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu takas teklifini sadece hedef başkan kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                const acceptEmbed = embeds.createSuccess(
                    'Takas Kabul Edildi!',
                    `**${tradeData.playerName}** <> **${tradeData.targetPlayer}**\n\nBaşkanlar takasladi! Takas işlemi tamamlandı! 🔄${tradeData.additionalAmount !== '0' ? `\n\n**Ek Miktar:** ${tradeData.additionalAmount}` : ''}`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Otomatik transfer duyurusu gönder
                await this.sendTransferAnnouncement(interaction.guild, {
                    player: player.user,
                    team: fromPresident.displayName,
                    type: 'takas',
                    amount: tradeData.additionalAmount !== '0' ? tradeData.additionalAmount : null,
                    salary: tradeData.salary,
                    duration: tradeData.contractDuration,
                    playerName: tradeData.playerName,
                    targetPlayer: tradeData.targetPlayer
                });

                // Transfer geçmişine kaydet  
                await api.logTransfer({
                    type: 'trade_accepted',
                    player: player.user.username,
                    from: targetPresident.displayName,
                    to: fromPresident.displayName,
                    amount: 0
                });

                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Takas tamamlandı');
                }, 5000);

                break;

            case 'reject':
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu takas teklifini sadece hedef başkan reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Takas Reddedildi',
                    `${player} için takas teklifi reddedildi.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Takas reddedildi');
                }, 5000);

                break;

            case 'edit':
                // "Düzenle" butonu - teklif veren başkan modalı açacak
                if (interaction.user.id !== fromPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Teklifi sadece teklif veren başkan düzenleyebilir!', 
                        ephemeral: true 
                    });
                }

                // Takas düzenleme modal'ını aç
                await this.handleShowTradeModal(client, interaction, [targetPresidentId, fromPresidentId, playerId]);
                break;
        }
    }

    async handleReleaseButton(client, interaction, params) {
        // release_accept_playerID_presidentID, release_confirm_playerID_presidentID_unilateral, release_cancel_playerID_presidentID
        const [buttonType, playerId, presidentId, releaseType] = params;
        
        const player = interaction.guild.members.cache.get(playerId);
        const president = interaction.guild.members.cache.get(presidentId);

        if (!player || !president) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        // Embed'den modal verilerini çıkar
        let releaseData = {
            oldClub: 'Belirtilmedi',
            compensation: 'Belirtilmedi',
            reason: 'Sözleşme feshi',
            newTeam: 'Belirtilmedi'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Ek Tazminat') || field.name.includes('Tazminat')) {
                        releaseData.compensation = field.value;
                    } else if (field.name.includes('Fesih Sebebi') || field.name.includes('Sebep')) {
                        releaseData.reason = field.value;
                    } else if (field.name.includes('Yeni Takım')) {
                        releaseData.newTeam = field.value;
                    } else if (field.name.includes('Ek Ödemeler')) {
                        releaseData.bonus = field.value;
                    } else if (field.name.includes('Eski Kulüp')) {
                        releaseData.oldClub = field.value;
                    }
                }
            }
        }

        switch (buttonType) {
            case 'accept':
                // Karşılıklı fesih - sadece futbolcu kabul edebilir
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Karşılıklı feshi sadece futbolcu kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                // Oyuncuyu serbest yap
                await permissions.makePlayerFree(player);

                const acceptEmbed = embeds.createSuccess(
                    'Karşılıklı Fesih Kabul Edildi!',
                    `${player} ile ${president.displayName} arasında karşılıklı fesih anlaşması tamamlandı!\n\n**${player.user.username}** SERBEST KALDI! 🆓`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Transfer duyurusu ve serbest futbolcu duyurusu gönder
                await this.sendReleaseTransferAnnouncement(
                    interaction.guild, 
                    player.user, 
                    releaseData,
                    'mutual' // Karşılıklı fesih
                );
                
                await this.sendDetailedFreeAgentAnnouncement(
                    interaction.guild, 
                    player.user, 
                    releaseData
                );

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Karşılıklı fesih tamamlandı');
                }, 5000);

                break;

            case 'reject':
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Karşılıklı feshi sadece futbolcu reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Karşılıklı Fesih Reddedildi',
                    `${player} karşılıklı fesih teklifini reddetti.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Karşılıklı fesih reddedildi');
                }, 5000);

                break;

            case 'confirm':
                // Tek taraflı fesih - sadece başkan onaylayabilir
                if (interaction.user.id !== presidentId) {
                    return interaction.reply({ 
                        content: '❌ Tek taraflı feshi sadece başkan onaylayabilir!', 
                        ephemeral: true 
                    });
                }

                // Oyuncuyu serbest yap
                await permissions.makePlayerFree(player);

                const confirmEmbed = embeds.createSuccess(
                    'Tek Taraflı Fesih Tamamlandı!',
                    `${president.displayName} tarafından **${player.user.username}** ile tek taraflı fesih gerçekleştirildi!\n\n**${player.user.username}** SERBEST KALDI! 🆓`
                );

                await interaction.update({ 
                    embeds: [confirmEmbed], 
                    components: [] 
                });

                // Tek taraflı fesih için sadece basit serbest futbolcu duyurusu
                await this.sendSimpleFreeAgentAnnouncement(
                    interaction.guild, 
                    player.user, 
                    player.user.username
                );

                // Tek taraflı fesihte kanal silinmez - sadece mesaj gönderilir

                break;

            case 'cancel':
                if (interaction.user.id !== presidentId) {
                    return interaction.reply({ 
                        content: '❌ İşlemi sadece başkan iptal edebilir!', 
                        ephemeral: true 
                    });
                }

                const cancelEmbed = new EmbedBuilder()
                    .setColor(config.colors.text)
                    .setTitle(`${config.emojis.cross} Fesih İptal Edildi`)
                    .setDescription('Fesih işlemi iptal edildi.')
                    .setTimestamp();

                await interaction.update({ 
                    embeds: [cancelEmbed], 
                    components: [] 
                });

                // Kanalı 3 saniye sonra sil
                setTimeout(async () => {
                    if (interaction.channel && interaction.channel.delete) {
                        await interaction.channel.delete('Fesih işlemi iptal edildi');
                    }
                }, 3000);

                break;
        }
    }

    async handleHireButton(client, interaction, params) {
        // hire_accept_targetPresidentID_fromPresidentID_playerID
        const [buttonType, targetPresidentId, fromPresidentId, playerId] = params;
        
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        // Embed'den modal verilerini çıkar
        let hireData = {
            loanFee: '5.000.000₺',
            salary: '800.000₺/ay',
            loanDuration: '1 sezon',
            oldClub: 'Belirtilmedi'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Kiralık Bedeli')) {
                        hireData.loanFee = field.value;
                    } else if (field.name.includes('Maaş')) {
                        hireData.salary = field.value;
                    } else if (field.name.includes('Kiralık Süresi')) {
                        hireData.loanDuration = field.value;
                    } else if (field.name.includes('Eski Kulüp')) {
                        hireData.oldClub = field.value;
                    }
                }
            }
        }

        switch (buttonType) {
            case 'accept':
                // Sadece hedef başkan kabul edebilir
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu kiralık teklifini sadece hedef başkan kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                const acceptEmbed = embeds.createSuccess(
                    'Kiralık Sözleşme Tamamlandı!',
                    `${player} ${fromPresident.displayName} takımına kiralık olarak transfer oldu!\n\n🎉 Kiralık transfer başarıyla tamamlandı!`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Otomatik transfer duyurusu gönder
                await this.sendTransferAnnouncement(interaction.guild, {
                    player: player.user,
                    team: fromPresident.displayName,
                    type: 'kiralik',
                    amount: hireData.loanFee,
                    salary: hireData.salary,
                    duration: hireData.loanDuration,
                    oldClub: hireData.oldClub
                });

                // Transfer geçmişine kaydet
                await api.logTransfer({
                    type: 'loan_completed',
                    player: player.user.username,
                    from: targetPresident.displayName,
                    to: fromPresident.displayName,
                    amount: 0
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Kiralık sözleşme tamamlandı');
                }, 5000);

                break;

            case 'reject':
                // Sadece hedef başkan reddedebilir
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Bu kiralık teklifini sadece hedef başkan reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Kiralık Sözleşme Reddedildi',
                    `${player} için kiralık teklifi reddedildi.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Kiralık teklifi reddedildi');
                }, 5000);

                break;
        }
    }

    async handleRoleButton(client, interaction, params) {
        // Rol ayarlama menüsü için
        await interaction.reply({ 
            content: '🔧 Rol ayarlama özelliği yakında tamamlanacak!', 
            ephemeral: true 
        });
    }

    async handleContractPlayerButton(client, interaction, params) {
        // contract_player_accept_playerID_fromPresidentID_targetPresidentID
        const [buttonType, playerId, fromPresidentId, targetPresidentId] = params;
        
        const player = interaction.guild.members.cache.get(playerId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);

        if (!player || !fromPresident || !targetPresident) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
        }

        // Embed'den modal verilerini çıkar
        let contractData = {
            transferFee: '5.000.000₺',
            salary: '10.000.000₺/yıl',
            contractDuration: '4 yıl',
            bonus: '3.000.000₺'
        };

        // Embed'deki verileri kullan
        if (interaction.message && interaction.message.embeds.length > 0) {
            const embed = interaction.message.embeds[0];
            if (embed.fields) {
                for (const field of embed.fields) {
                    if (field.name.includes('Transfer Bedeli')) {
                        contractData.transferFee = field.value;
                    } else if (field.name.includes('Maaş')) {
                        contractData.salary = field.value;
                    } else if (field.name.includes('Sözleşme Süresi')) {
                        contractData.contractDuration = field.value;
                    } else if (field.name.includes('Bonuslar')) {
                        contractData.bonus = field.value;
                    }
                }
            }
        }

        switch (buttonType) {
            case 'accept':
                // Sadece oyuncu kabul edebilir
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Bu sözleşmeyi sadece oyuncu kabul edebilir!', 
                        ephemeral: true 
                    });
                }

                const acceptEmbed = embeds.createSuccess(
                    'Sözleşme Tamamlandı!',
                    `${player} ${fromPresident.displayName} takımı ile sözleşme imzaladı!\n\n🎉 Transfer başarıyla tamamlandı!`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Otomatik transfer duyurusu gönder
                await this.sendTransferAnnouncement(interaction.guild, {
                    player: player.user,
                    team: fromPresident.displayName,
                    type: 'transfer',
                    amount: contractData.transferFee,
                    salary: contractData.salary,
                    duration: contractData.contractDuration,
                    bonus: contractData.bonus,
                    oldClub: contractData.oldClub
                });

                // Transfer geçmişine kaydet
                await api.logTransfer({
                    type: 'contract_completed',
                    player: player.user.username,
                    from: targetPresident.displayName,
                    to: fromPresident.displayName,
                    amount: 2500000
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Sözleşme tamamlandı');
                }, 5000);

                break;

            case 'reject':
                // Sadece oyuncu reddedebilir
                if (interaction.user.id !== playerId) {
                    return interaction.reply({ 
                        content: '❌ Bu sözleşmeyi sadece oyuncu reddedebilir!', 
                        ephemeral: true 
                    });
                }

                const rejectEmbed = embeds.createError(
                    'Sözleşme Oyuncu Tarafından Reddedildi',
                    `${player} ${fromPresident.displayName} takımının sözleşme teklifini reddetti.`
                );

                await interaction.update({ 
                    embeds: [rejectEmbed], 
                    components: [] 
                });

                // Kanalı 5 saniye sonra sil
                setTimeout(async () => {
                    await channels.deleteNegotiationChannel(interaction.channel, 'Sözleşme reddedildi');
                }, 5000);

                break;
        }
    }

    async sendTransferAnnouncement(guild, transferData) {
        try {
            // Transfer duyuru kanalını bul
            const fs = require('fs');
            const path = require('path');
            const rolesPath = path.join(__dirname, '../data/roles.json');
            
            let allData = {};
            try {
                allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            } catch (error) {
                console.log('Transfer duyuru kanalı ayarlanmamış');
                return;
            }
            
            const guildData = allData[guild.id];
            if (!guildData || !guildData.transferChannel) {
                console.log('Transfer duyuru kanalı ayarlanmamış');
                return;
            }
            
            const transferChannel = guild.channels.cache.get(guildData.transferChannel);
            if (!transferChannel) {
                console.log('Transfer duyuru kanalı bulunamadı');
                return;
            }

            // Transfer türüne göre renk ve başlık
            let color = config.colors.success;
            let title = '';
            
            switch (transferData.type) {
                case 'serbest_transfer':
                    color = config.colors.primary;
                    title = 'SERBEST TRANSFER TAMAMLANDI';
                    break;
                case 'transfer':
                    color = config.colors.success;
                    title = 'SÖZLEŞME TRANSFER TAMAMLANDI';
                    break;
                case 'takas':
                    color = config.colors.accent;
                    title = 'TAKAS TRANSFER TAMAMLANDI';
                    break;
                case 'kiralik':
                    color = config.colors.warning;
                    title = 'KİRALIK TRANSFER TAMAMLANDI';
                    break;
                default:
                    title = 'TRANSFER TAMAMLANDI';
            }

            // Transfer duyuru embed'i oluştur - oyuncunun avatarını kullan
            const playerDisplayName = transferData.playerName || transferData.player.username;
            const announcementEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${config.emojis.football} ${title}`)
                .setDescription(`**${playerDisplayName}** ${transferData.team} takımı ile anlaştı!`)
                .setThumbnail(transferData.player.displayAvatarURL({ dynamic: true }));

            // Trade için farklı format, diğerleri için eski kulüp
            if (transferData.type === 'takas') {
                announcementEmbed.addFields(
                    { name: '⚽ Oyuncu', value: transferData.playerName ? `${transferData.player} (${transferData.playerName})` : `${transferData.player}`, inline: true },
                    { name: '🏟️ Yeni Takım', value: transferData.team, inline: true },
                    { name: '📋 Transfer Türü', value: 'Takas', inline: true }
                );
            } else {
                announcementEmbed.addFields(
                    { name: '⚽ Oyuncu', value: `${transferData.player}`, inline: true },
                    { name: '🏆 Eski Kulüp', value: transferData.oldClub || 'Belirtilmedi', inline: true },
                    { name: '🏟️ Yeni Takım', value: transferData.team, inline: true },
                    { name: '📋 Transfer Türü', value: transferData.type === 'serbest_transfer' ? 'Serbest Transfer' : transferData.type === 'kiralik' ? 'Kiralık Transfer' : transferData.type.charAt(0).toUpperCase() + transferData.type.slice(1), inline: true }
                );
            }

            // Transfer detayları ekle - sadece dolu alanları göster
            if (transferData.amount && transferData.amount.trim() && transferData.amount !== '0') {
                announcementEmbed.addFields({ name: '💰 Transfer Bedeli', value: transferData.amount, inline: true });
            }
            if (transferData.salary && transferData.salary.trim()) {
                announcementEmbed.addFields({ name: '💵 Maaş', value: transferData.salary, inline: true });
            }
            if (transferData.duration && transferData.duration.trim()) {
                announcementEmbed.addFields({ name: '📅 Sözleşme Süresi & Ek Madde', value: transferData.duration, inline: true });
            }
            if (transferData.bonus && transferData.bonus.trim()) {
                announcementEmbed.addFields({ name: '🎯 Bonuslar', value: transferData.bonus, inline: true });
            }
            if (transferData.targetPlayer && transferData.targetPlayer !== 'Belirtilmedi' && transferData.targetPlayer.trim()) {
                announcementEmbed.addFields({ name: '⚽ İstenen Oyuncu', value: transferData.targetPlayer, inline: true });
            }
            if (transferData.signingBonus && transferData.signingBonus.trim()) {
                announcementEmbed.addFields({ name: '💎 İmza Parası', value: transferData.signingBonus, inline: true });
            }

            announcementEmbed
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi', iconURL: guild.iconURL() });

            // Ping rolünü al
            const transferRolesPath = path.join(__dirname, '../data/roles.json');
            
            let pingContent = `🎉 **YENİ TRANSFER DUYURUSU** 🎉`;
            
            try {
                const allData = JSON.parse(fs.readFileSync(transferRolesPath, 'utf8'));
                const guildData = allData[guild.id];
                
                if (guildData && guildData.transferPingRole) {
                    const pingRole = guild.roles.cache.get(guildData.transferPingRole);
                    if (pingRole) {
                        pingContent = `🎉 **YENİ TRANSFER DUYURUSU** 🎉\n${pingRole}`;
                    }
                }
            } catch (error) {
                console.log('Ping rol bulunamadı:', error.message);
            }

            // Duyuruyu gönder
            await transferChannel.send({
                content: pingContent,
                embeds: [announcementEmbed]
            });

            console.log(`Transfer duyurusu gönderildi: ${transferData.player.username} -> ${transferData.team}`);

        } catch (error) {
            console.error('Transfer duyurusu gönderme hatası:', error);
        }
    }

    async handleShowOfferModal(client, interaction, params) {
        const [playerId, presidentId] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`offer_form_${playerId}_${presidentId}`)
            .setTitle('Transfer Teklifi Formu');

        // Form alanları
        const newTeamInput = new TextInputBuilder()
            .setCustomId('new_team')
            .setLabel('Yeni Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(true);

        const playerNameInput = new TextInputBuilder()
            .setCustomId('player_name')
            .setLabel('Oyuncu İsmi')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Cristiano Ronaldo')
            .setRequired(true);

        const salaryInput = new TextInputBuilder()
            .setCustomId('salary')
            .setLabel('Maaş')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 6.000.000₺/yıl')
            .setRequired(true);

        const contractDurationInput = new TextInputBuilder()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme Süresi & Ek Madde')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 3 yıl, Gol bonusu 50k')
            .setRequired(true);

        const bonusInput = new TextInputBuilder()
            .setCustomId('bonus')
            .setLabel('Bonuslar')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 500.000₺')
            .setRequired(true);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(newTeamInput);
        const row2 = new ActionRowBuilder().addComponents(oldClubInput);
        const row3 = new ActionRowBuilder().addComponents(salaryInput);
        const row4 = new ActionRowBuilder().addComponents(contractDurationInput);
        const row5 = new ActionRowBuilder().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async handleShowContractModal(client, interaction, params) {
        const [targetPresidentId, fromPresidentId, playerId] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`contract_form_${targetPresidentId}_${fromPresidentId}_${playerId}`)
            .setTitle('Sözleşme Teklifi Formu');

        // Form alanları
        const newClubInput = new TextInputBuilder()
            .setCustomId('new_club')
            .setLabel('Yeni Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Galatasaray')
            .setRequired(true);

        const oldClubInput = new TextInputBuilder()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(true);

        const transferFeeInput = new TextInputBuilder()
            .setCustomId('transfer_fee')
            .setLabel('Transfer Bedeli')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 50.000.000₺')
            .setRequired(true);

        const salaryInput = new TextInputBuilder()
            .setCustomId('salary')
            .setLabel('Yıllık Maaş')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 24.000.000₺/yıl')
            .setRequired(true);

        const contractDurationInput = new TextInputBuilder()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme Süresi & Ek Madde')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 4 yıl, Kaleci bonusu 100k')
            .setRequired(true);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(newClubInput);
        const row2 = new ActionRowBuilder().addComponents(oldClubInput);
        const row3 = new ActionRowBuilder().addComponents(transferFeeInput);
        const row4 = new ActionRowBuilder().addComponents(salaryInput);
        const row5 = new ActionRowBuilder().addComponents(contractDurationInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async handleShowTradeModal(client, interaction, params) {
        const [targetPresidentId, fromPresidentId, playerId] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`trade_form_${targetPresidentId}_${fromPresidentId}_${playerId}`)
            .setTitle('Takas Teklifi Formu');

        // Form alanları
        const playerNameInput = new TextInputBuilder()
            .setCustomId('player_name')
            .setLabel('Oyuncu İsmi')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Neymar Jr')
            .setRequired(true);

        const additionalAmountInput = new TextInputBuilder()
            .setCustomId('additional_amount')
            .setLabel('Ek Miktar')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 15.000.000₺')
            .setRequired(true);

        const salaryInput = new TextInputBuilder()
            .setCustomId('salary')
            .setLabel('Maaş')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 1.500.000₺/ay')
            .setRequired(true);

        const contractDurationInput = new TextInputBuilder()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme Süresi & Ek Madde')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 4 yıl, Taraftar bonusu')
            .setRequired(true);

        const targetPlayerInput = new TextInputBuilder()
            .setCustomId('target_player')
            .setLabel('İstenen Oyuncu')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Lionel Messi')
            .setRequired(true);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(playerNameInput);
        const row2 = new ActionRowBuilder().addComponents(additionalAmountInput);
        const row3 = new ActionRowBuilder().addComponents(salaryInput);
        const row4 = new ActionRowBuilder().addComponents(contractDurationInput);
        const row5 = new ActionRowBuilder().addComponents(targetPlayerInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async handleShowReleaseModal(client, interaction, params) {
        const [playerId, presidentId, releaseType] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`release_form_${playerId}_${presidentId}_${releaseType}`)
            .setTitle('Karşılıklı Fesih Formu');

        // Form alanları
        const oldClubInput = new TextInputBuilder()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(true);

        const compensationInput = new TextInputBuilder()
            .setCustomId('compensation')
            .setLabel('Ek Tazminat')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 5.000.000₺')
            .setRequired(false);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Fesih Sebebi')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Örn: Karşılıklı anlaşma ile ayrılık')
            .setRequired(true);

        const newTeamInput = new TextInputBuilder()
            .setCustomId('new_team')
            .setLabel('Yeni Takım (Opsiyonel)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(false);

        const bonusInput = new TextInputBuilder()
            .setCustomId('bonus')
            .setLabel('Ek Ödemeler')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 2.000.000₺')
            .setRequired(false);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(oldClubInput);
        const row2 = new ActionRowBuilder().addComponents(compensationInput);
        const row3 = new ActionRowBuilder().addComponents(reasonInput);
        const row4 = new ActionRowBuilder().addComponents(newTeamInput);
        const row5 = new ActionRowBuilder().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async handleShowHireModal(client, interaction, params) {
        const [targetPresidentId, fromPresidentId, playerId] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`hire_form_${targetPresidentId}_${fromPresidentId}_${playerId}`)
            .setTitle('Kiralık Sözleşme Formu');

        // Form alanları
        const newClubInput = new TextInputBuilder()
            .setCustomId('new_club')
            .setLabel('Yeni Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Barcelona')
            .setRequired(true);

        const oldClubInput = new TextInputBuilder()
            .setCustomId('old_club')
            .setLabel('Eski Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(true);

        const loanFeeInput = new TextInputBuilder()
            .setCustomId('loan_fee')
            .setLabel('Kiralık Bedeli')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 5.000.000₺')
            .setRequired(true);

        const salaryInput = new TextInputBuilder()
            .setCustomId('salary')
            .setLabel('Kiralık Maaş')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 800.000₺/ay')
            .setRequired(true);

        const loanDurationInput = new TextInputBuilder()
            .setCustomId('loan_duration')
            .setLabel('Kiralık Süresi & Ek Madde')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 1 sezon, Geri çağırma hakkı')
            .setRequired(true);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(newClubInput);
        const row2 = new ActionRowBuilder().addComponents(oldClubInput);
        const row3 = new ActionRowBuilder().addComponents(loanFeeInput);
        const row4 = new ActionRowBuilder().addComponents(salaryInput);
        const row5 = new ActionRowBuilder().addComponents(loanDurationInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async handleShowAnnouncementModal(client, interaction, params) {
        const [playerId] = params;
        
        // Modal formu oluştur
        const modal = new ModalBuilder()
            .setCustomId(`announcement_form_${playerId}`)
            .setTitle('Serbest Futbolcu Duyuru Formu');

        // Form alanları
        const playerNameInput = new TextInputBuilder()
            .setCustomId('player_name')
            .setLabel('İsim')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Cristiano Ronaldo')
            .setRequired(true);

        const newClubInput = new TextInputBuilder()
            .setCustomId('new_club')
            .setLabel('Yeni Kulüp')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Real Madrid')
            .setRequired(true);

        const salaryInput = new TextInputBuilder()
            .setCustomId('salary')
            .setLabel('Maaş')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 2.000.000₺/yıl')
            .setRequired(true);

        const contractYearsInput = new TextInputBuilder()
            .setCustomId('contract_years')
            .setLabel('Sözleşme Yılı & Ek Madde')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 3 yıl, Performans bonusu')
            .setRequired(true);

        const signingBonusInput = new TextInputBuilder()
            .setCustomId('signing_bonus')
            .setLabel('Bonus')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 1.000.000₺')
            .setRequired(true);

        // Action Row'lar oluştur (en fazla 5 tane olabilir)
        const row1 = new ActionRowBuilder().addComponents(playerNameInput);
        const row2 = new ActionRowBuilder().addComponents(newClubInput);
        const row3 = new ActionRowBuilder().addComponents(salaryInput);
        const row4 = new ActionRowBuilder().addComponents(contractYearsInput);
        const row5 = new ActionRowBuilder().addComponents(signingBonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }

    async createEnhancedFreeAgentAnnouncement(guild, player, releaseData, defaultReason) {
        try {
            const channels = require('../utils/channels');
            const freeAgentChannel = await channels.findFreeAgentChannel(guild);
            
            if (!freeAgentChannel) {
                console.log('Serbest futbolcu kanalı bulunamadı');
                return null;
            }

            const { EmbedBuilder } = require('discord.js');
            const config = require('../config');

            const playerDisplayName = releaseData.playerName || player.username;
            const reason = releaseData.reason !== 'Sözleşme feshi' ? releaseData.reason : defaultReason;
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🆓 Yeni Serbest Futbolcu')
                .setDescription(`**${playerDisplayName}** artık serbest futbolcu!\n\nTransfer teklifleri için \`.offer\` komutunu kullanabilirsiniz.`)
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚽ Oyuncu', value: releaseData.playerName ? `${player} (${releaseData.playerName})` : `${player}`, inline: true },
                    { name: '📋 Fesih Sebebi', value: reason, inline: true }
                );

            // Ek bilgileri ekle
            if (releaseData.compensation && releaseData.compensation !== 'Belirtilmedi' && releaseData.compensation.trim() !== '') {
                embed.addFields({ name: '💰 Tazminat', value: releaseData.compensation, inline: true });
            }
            
            if (releaseData.newTeam && releaseData.newTeam !== 'Belirtilmedi' && releaseData.newTeam.trim() !== '') {
                embed.addFields({ name: '🏆 Potansiyel Yeni Takım', value: releaseData.newTeam, inline: true });
            }

            if (releaseData.bonus && releaseData.bonus !== 'Belirtilmedi' && releaseData.bonus.trim() !== '') {
                embed.addFields({ name: '💎 Ek Ödemeler', value: releaseData.bonus, inline: true });
            }

            embed.setTimestamp()
                .setFooter({ text: 'Serbest Futbolcu Sistemi', iconURL: guild.iconURL() });

            // Ping rolünü al
            const freeAgentRolesPath = path.join(__dirname, '../data/roles.json');
            
            let pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU**`;
            
            try {
                const allData = JSON.parse(fs.readFileSync(freeAgentRolesPath, 'utf8'));
                const guildData = allData[guild.id];
                
                if (guildData && guildData.freeAgentPingRole) {
                    const pingRole = guild.roles.cache.get(guildData.freeAgentPingRole);
                    if (pingRole) {
                        pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU**\n${pingRole}`;
                    }
                }
            } catch (error) {
                console.log('Ping rol bulunamadı:', error.message);
            }

            const message = await freeAgentChannel.send({
                content: pingContent,
                embeds: [embed]
            });

            console.log(`Serbest futbolcu duyurusu gönderildi: ${player.username}`);
            return message;

        } catch (error) {
            console.error('Gelişmiş serbest futbolcu duyurusu hatası:', error);
            // Fallback olarak standart duyuru
            const channels = require('../utils/channels');
            return await channels.createFreeAgentAnnouncement(guild, player, defaultReason);
        }
    }

    async sendReleaseTransferAnnouncement(guild, player, releaseData, releaseType) {
        try {
            // Transfer duyuru kanalını bul
            const fs = require('fs');
            const path = require('path');
            const config = require('../config');
            const rolesPath = path.join(__dirname, '../data/roles.json');
            
            let allData = {};
            try {
                allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            } catch (error) {
                console.log('Transfer duyuru kanalı ayarlanmamış');
                return;
            }
            
            const guildData = allData[guild.id];
            if (!guildData || !guildData.transferChannel) {
                console.log('Transfer duyuru kanalı ayarlanmamış');
                return;
            }
            
            const transferChannel = guild.channels.cache.get(guildData.transferChannel);
            if (!transferChannel) {
                console.log('Transfer duyuru kanalı bulunamadı');
                return;
            }

            // Release form verilerini kullanarak transfer duyurusu oluştur
            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.release} FESIH TRANSFER TAMAMLANDI`)
                .setDescription(`**${player.username}** için fesih işlemi tamamlandı!`)
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚽ Oyuncu', value: player.username, inline: true },
                    { name: '🏆 Eski Kulüp', value: releaseData.oldClub || 'Belirtilmedi', inline: true },
                    { name: '📋 Fesih Türü', value: releaseType === 'mutual' ? 'Karşılıklı Anlaşma' : 'Tek Taraflı', inline: true },
                    { name: '💡 Durum', value: 'Serbest Futbolcu', inline: true }
                );

            // Sadece dolu alanları ekle
            if (releaseData.reason && releaseData.reason !== 'Sözleşme feshi' && releaseData.reason.trim()) {
                embed.addFields({ name: '📄 Sebep', value: releaseData.reason, inline: false });
            }

            if (releaseData.compensation && releaseData.compensation !== 'Belirtilmedi' && releaseData.compensation.trim()) {
                embed.addFields({ name: '💰 Tazminat', value: releaseData.compensation, inline: true });
            }

            if (releaseData.newTeam && releaseData.newTeam !== 'Belirtilmedi' && releaseData.newTeam.trim()) {
                embed.addFields({ name: '🏆 Potansiyel Yeni Takım', value: releaseData.newTeam, inline: true });
            }

            if (releaseData.bonus && releaseData.bonus !== 'Belirtilmedi' && releaseData.bonus.trim()) {
                embed.addFields({ name: '💎 Ek Ödemeler', value: releaseData.bonus, inline: true });
            }

            embed.setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Ping rolü
            let pingContent = `${config.emojis.release} **FESIH TRANSFER DUYURUSU**`;
            
            if (guildData.transferPingRole) {
                const pingRole = guild.roles.cache.get(guildData.transferPingRole);
                if (pingRole) {
                    pingContent = `${config.emojis.release} **FESIH TRANSFER DUYURUSU**\n${pingRole}`;
                }
            }

            await transferChannel.send({
                content: pingContent,
                embeds: [embed]
            });

            console.log(`Fesih transfer duyurusu gönderildi: ${player.username}`);

        } catch (error) {
            console.error('Fesih transfer duyurusu hatası:', error);
        }
    }

    async sendDetailedFreeAgentAnnouncement(guild, player, releaseData) {
        try {
            // Serbest-ayarla ile ayarlanan kanalı bul
            const fs = require('fs');
            const path = require('path');
            const config = require('../config');
            const rolesPath = path.join(__dirname, '../data/roles.json');
            
            let allData = {};
            try {
                allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            } catch (error) {
                console.log('Serbest futbolcu kanalı ayarlanmamış');
                return;
            }
            
            const guildData = allData[guild.id];
            if (!guildData || !guildData.freeAgentChannel) {
                console.log('Serbest futbolcu kanalı ayarlanmamış');
                return;
            }
            
            const freeAgentChannel = guild.channels.cache.get(guildData.freeAgentChannel);
            if (!freeAgentChannel) {
                console.log('Serbest futbolcu kanalı bulunamadı');
                return;
            }

            // Detaylı serbest futbolcu duyurusu
            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🆓 YENİ SERBEST FUTBOLCU')
                .setDescription(`**${player.username}** artık serbest futbolcu!\n\nTransfer teklifleri için \`.offer\` komutunu kullanabilirsiniz.`)
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚽ Oyuncu', value: `${player}`, inline: true },
                    { name: '🏆 Eski Kulüp', value: releaseData.oldClub || 'Belirtilmedi', inline: true },
                    { name: '📋 Fesih Sebebi', value: releaseData.reason || 'Karşılıklı anlaşma', inline: true }
                );

            // Sadece dolu alanları ekle
            if (releaseData.compensation && releaseData.compensation !== 'Belirtilmedi' && releaseData.compensation.trim()) {
                embed.addFields({ name: '💰 Alınan Tazminat', value: releaseData.compensation, inline: true });
            }

            if (releaseData.newTeam && releaseData.newTeam !== 'Belirtilmedi' && releaseData.newTeam.trim()) {
                embed.addFields({ name: '🏆 Potansiyel Yeni Takım', value: releaseData.newTeam, inline: true });
            }

            if (releaseData.bonus && releaseData.bonus !== 'Belirtilmedi' && releaseData.bonus.trim()) {
                embed.addFields({ name: '💎 Ek Ödemeler', value: releaseData.bonus, inline: true });
            }

            embed.setTimestamp()
                .setFooter({ text: 'Serbest Futbolcu Sistemi' });

            // Ping rolü
            let pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU**`;
            
            if (guildData.freeAgentPingRole) {
                const pingRole = guild.roles.cache.get(guildData.freeAgentPingRole);
                if (pingRole) {
                    pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU**\n${pingRole}`;
                }
            }

            await freeAgentChannel.send({
                content: pingContent,
                embeds: [embed]
            });

            console.log(`Detaylı serbest futbolcu duyurusu gönderildi: ${player.username}`);

        } catch (error) {
            console.error('Detaylı serbest futbolcu duyurusu hatası:', error);
        }
    }

    async sendSimpleFreeAgentAnnouncement(guild, player, playerName) {
        try {
            // Serbest-ayarla ile ayarlanan kanalı bul
            const fs = require('fs');
            const path = require('path');
            const config = require('../config');
            const rolesPath = path.join(__dirname, '../data/roles.json');
            
            let allData = {};
            try {
                allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            } catch (error) {
                // Fallback: Kanal isminden bul
                const announcementChannel = guild.channels.cache.find(c => 
                    c.type === 0 && // GuildText
                    (c.name.includes('serbest-duyuru') || c.name.includes('serbest-oyuncu'))
                );
                
                if (announcementChannel) {
                    await announcementChannel.send({
                        content: `${config.emojis.football} **${playerName}** serbest kaldı!`
                    });
                    console.log(`Basit serbest futbolcu duyurusu gönderildi: ${playerName}`);
                }
                return;
            }
            
            const guildData = allData[guild.id];
            if (!guildData || !guildData.freeAgentChannel) {
                console.log('Serbest futbolcu kanalı ayarlanmamış');
                return;
            }
            
            const freeAgentChannel = guild.channels.cache.get(guildData.freeAgentChannel);
            if (!freeAgentChannel) {
                console.log('Serbest futbolcu kanalı bulunamadı');
                return;
            }

            // Basit serbest futbolcu mesajı
            await freeAgentChannel.send({
                content: `${config.emojis.football} **${playerName}** serbest kaldı!`
            });

            console.log(`Basit serbest futbolcu duyurusu gönderildi: ${playerName}`);

        } catch (error) {
            console.error('Basit serbest futbolcu duyurusu hatası:', error);
        }
    }
}

module.exports = new ButtonHandler();
