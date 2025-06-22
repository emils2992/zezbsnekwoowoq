const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');
const api = require('../utils/api');

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
        // offer_accept_playerID_presidentID_offerData veya offer_reject_playerID_presidentID
        const [buttonType, playerId, presidentId, offerDataEncoded] = params;
        const player = interaction.guild.members.cache.get(playerId);
        const president = interaction.guild.members.cache.get(presidentId);
        
        // Offer data'yı decode et
        let offerData = null;
        if (offerDataEncoded && buttonType === 'accept') {
            try {
                offerData = JSON.parse(Buffer.from(offerDataEncoded, 'base64').toString());
            } catch (error) {
                console.error('Offer data decode hatası:', error);
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
                    team: president.displayName,
                    type: 'serbest_transfer',
                    salary: offerData?.salary || '500.000₺/ay',
                    bonus: offerData?.bonus || '250.000₺',
                    duration: offerData?.contractDuration || '2 yıl',
                    signingBonus: offerData?.signingBonus || '1.000.000₺',
                    playerName: offerData?.playerName
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
                    const playerEmbed = embeds.createContractForm(fromPresident.user, targetPresident.user, player.user);
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
        // trade_accept_targetPresidentID_fromPresidentID_playerID_amount
        const [buttonType, targetPresidentId, fromPresidentId, playerId, amount] = params;
        
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
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
                    `${player} için takas teklifi kabul edildi!\n\n**Takas:** ${player} ➜ ${fromPresident.displayName} kulübü\n${amount && parseInt(amount) > 0 ? `**Ek Miktar:** ${parseInt(amount).toLocaleString('tr-TR')}₺\n` : ''}Takas işlemi tamamlandı! 🔄`
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
                    amount: amount && parseInt(amount) > 0 ? `${parseInt(amount).toLocaleString('tr-TR')}₺` : null,
                    salary: '850.000₺/ay',
                    duration: '4 yıl'
                });

                // Transfer geçmişine kaydet
                await api.logTransfer({
                    type: 'trade_accepted',
                    player: player.user.username,
                    from: targetPresident.displayName,
                    to: fromPresident.displayName,
                    amount: parseInt(amount) || 0
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

            case 'counter':
                // "Sende Yap" butonu - hedef başkan kendi oyuncusunu teklif edecek
                if (interaction.user.id !== targetPresidentId) {
                    return interaction.reply({ 
                        content: '❌ Sadece hedef başkan karşı teklif yapabilir!', 
                        ephemeral: true 
                    });
                }

                await interaction.reply({ 
                    content: `${config.emojis.transfer} ${targetPresident.displayName}, şimdi sizin hangi oyuncunuzu takas için teklif edeceğinizi belirtin!\n\nYeni takas komutu: \`.trade @${fromPresident.user.username} @oyuncunuz [ek_miktar]\``, 
                    ephemeral: false 
                });

                break;
        }
    }

    async handleReleaseButton(client, interaction, params) {
        // release_accept_playerID_presidentID veya release_confirm_playerID_presidentID
        const [buttonType, playerId, presidentId] = params;
        
        const player = interaction.guild.members.cache.get(playerId);
        const president = interaction.guild.members.cache.get(presidentId);

        if (!player || !president) {
            return interaction.reply({ 
                content: '❌ Kullanıcılar bulunamadı!', 
                ephemeral: true 
            });
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
                    `${player} ile ${president.displayName} arasında karşılıklı fesih anlaşması tamamlandı!\n\n${player} artık serbest futbolcu statüsündedir.`
                );

                await interaction.update({ 
                    embeds: [acceptEmbed], 
                    components: [] 
                });

                // Serbest futbolcu duyurusu yap
                await channels.createFreeAgentAnnouncement(
                    interaction.guild, 
                    player.user, 
                    'Karşılıklı fesih anlaşması'
                );

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
                    `${president.displayName} tarafından ${player} ile tek taraflı fesih gerçekleştirildi!\n\n${player} artık serbest futbolcu statüsündedir.`
                );

                await interaction.update({ 
                    embeds: [confirmEmbed], 
                    components: [] 
                });

                // Serbest futbolcu duyurusu yap
                await channels.createFreeAgentAnnouncement(
                    interaction.guild, 
                    player.user, 
                    'Tek taraflı fesih'
                );

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
                    amount: '2.500.000₺',
                    salary: '750.000₺/ay',
                    duration: '3 yıl'
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

            // Futbolcu yüzü al
            const playerFace = await api.getPlayerFace();

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
                default:
                    title = 'TRANSFER TAMAMLANDI';
            }

            // Transfer duyuru embed'i oluştur
            const playerDisplayName = transferData.playerName || transferData.player.username;
            const announcementEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${config.emojis.football} ${title}`)
                .setDescription(`**${playerDisplayName}** ${transferData.team} takımı ile anlaştı!`)
                .setThumbnail(playerFace)
                .addFields(
                    { name: '⚽ Oyuncu', value: transferData.playerName ? `${transferData.player} (${transferData.playerName})` : `${transferData.player}`, inline: true },
                    { name: '🏆 Yeni Takım', value: transferData.team, inline: true },
                    { name: '📋 Transfer Türü', value: transferData.type === 'serbest_transfer' ? 'Serbest Transfer' : transferData.type.charAt(0).toUpperCase() + transferData.type.slice(1), inline: true }
                );

            // Transfer detayları ekle
            if (transferData.amount) {
                announcementEmbed.addFields({ name: '💰 Transfer Bedeli', value: transferData.amount, inline: true });
            }
            if (transferData.salary) {
                announcementEmbed.addFields({ name: '💵 Maaş', value: transferData.salary, inline: true });
            }
            if (transferData.duration) {
                announcementEmbed.addFields({ name: '📅 Sözleşme Süresi', value: transferData.duration, inline: true });
            }
            if (transferData.bonus) {
                announcementEmbed.addFields({ name: '🎯 Bonuslar', value: transferData.bonus, inline: true });
            }
            if (transferData.signingBonus) {
                announcementEmbed.addFields({ name: '💎 İmza Parası', value: transferData.signingBonus, inline: true });
            }

            announcementEmbed
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi', iconURL: guild.iconURL() });

            // Duyuruyu gönder
            await transferChannel.send({
                content: `🎉 **YENİ TRANSFER DUYURUSU** 🎉`,
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
            .setPlaceholder('Örn: 750.000₺/ay')
            .setRequired(false);

        const signingBonusInput = new TextInputBuilder()
            .setCustomId('signing_bonus')
            .setLabel('İmza Primi')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 2.000.000₺')
            .setRequired(false);

        const contractDurationInput = new TextInputBuilder()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme Süresi')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 3 yıl')
            .setRequired(false);

        const bonusInput = new TextInputBuilder()
            .setCustomId('bonus')
            .setLabel('Bonuslar')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 500.000₺')
            .setRequired(false);

        // Action Row'lar oluştur
        const row1 = new ActionRowBuilder().addComponents(playerNameInput);
        const row2 = new ActionRowBuilder().addComponents(salaryInput);
        const row3 = new ActionRowBuilder().addComponents(signingBonusInput);
        const row4 = new ActionRowBuilder().addComponents(contractDurationInput);
        const row5 = new ActionRowBuilder().addComponents(bonusInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        // Modal'ı göster
        await interaction.showModal(modal);
    }
}

module.exports = new ButtonHandler();
