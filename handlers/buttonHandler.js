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
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu teklifi kabul edebilir!',
                    ephemeral: true
                });
            }

            await this.sendTransferAnnouncement(guild, {
                type: 'offer',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ Transfer kabul edildi!`,
                ephemeral: false
            });

            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'reject') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu teklifi reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Transfer reddedildi!`,
                ephemeral: false
            });

            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'edit') {
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            await this.handleShowOfferForm(client, interaction, [playerId, presidentId]);
        }
    }

    async handleContractButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan sözleşme teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

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

            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'reject') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan sözleşme teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Sözleşme reddedildi!`,
                ephemeral: false
            });

            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'edit') {
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            await this.handleShowContractForm(client, interaction, [playerId, presidentId]);
        }
    }

    async handleTradeButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan takas teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

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

            setTimeout(async () => {
                try {
                    if (interaction.channel.name.includes('muzakere')) {
                        await channels.deleteNegotiationChannel(interaction.channel, 'Takas kabul edildi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 2000);

        } else if (buttonType === 'reject') {
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan takas teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Takas reddedildi!`,
                ephemeral: false
            });

            setTimeout(async () => {
                try {
                    if (interaction.channel.name.includes('muzakere')) {
                        await channels.deleteNegotiationChannel(interaction.channel, 'Takas reddedildi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 2000);

        } else if (buttonType === 'edit') {
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            await this.handleShowTradeForm(client, interaction, [playerId, presidentId]);
        }
    }

    async handleReleaseButton(client, interaction, params) {
        const [buttonType, playerId, presidentId, releaseType] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Sadece hedef kişi (oyuncu) kabul edebilir
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu fesih teklifini kabul edebilir!',
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

            await interaction.reply({
                content: `✅ Fesih kabul edildi! **${player.displayName}** artık serbest oyuncu.`,
                ephemeral: false
            });

            // Kanalı hemen sil
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'reject') {
            // Sadece hedef kişi (oyuncu) reddet edebilir
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef oyuncu fesih teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Fesih reddedildi!`,
                ephemeral: false
            });

            // Kanalı hemen sil
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'edit') {
            // Sadece komutu kullanan kişi (başkan) düzenleyebilir
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            await this.handleShowReleaseForm(null, interaction, [playerId, presidentId, releaseType]);
        }
    }

    async handleHireButton(client, interaction, params) {
        const [buttonType, playerId, presidentId] = params;
        const guild = interaction.guild;
        const player = await guild.members.fetch(playerId);
        const president = await guild.members.fetch(presidentId);

        if (buttonType === 'accept') {
            // Kiralık tekliflerinde hedef başkan kabul edebilir (oyuncunun başkanı)
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan kiralık teklifini kabul edebilir!',
                    ephemeral: true
                });
            }

            await this.sendTransferAnnouncement(guild, {
                type: 'hire',
                player: player,
                president: president,
                embed: interaction.message.embeds[0]
            });

            await interaction.reply({
                content: `✅ Kiralık transfer kabul edildi!`,
                ephemeral: false
            });

            // Kanalı sil
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'reject') {
            // Sadece hedef başkan reddet edebilir
            if (interaction.user.id !== playerId) {
                return interaction.reply({
                    content: '❌ Sadece hedef başkan kiralık teklifini reddedebilir!',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `❌ Kiralık transfer reddedildi!`,
                ephemeral: false
            });

            // Kanalı sil
            setTimeout(async () => {
                try {
                    if (interaction.channel && interaction.channel.name && interaction.channel.name.includes('muzakere')) {
                        console.log(`Kanal siliniyor: ${interaction.channel.name}`);
                        await interaction.channel.delete();
                        console.log('Kanal başarıyla silindi');
                    }
                } catch (error) {
                    console.error('Kanal silinirken hata:', error);
                }
            }, 3000);

        } else if (buttonType === 'edit') {
            // Sadece komutu kullanan kişi (başkan) düzenleyebilir
            if (interaction.user.id !== presidentId) {
                return interaction.reply({
                    content: '❌ Sadece teklifi yapan başkan düzenleyebilir!',
                    ephemeral: true
                });
            }

            await this.handleShowHireForm(client, interaction, [playerId, presidentId]);
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
        if (!freeAgentChannel) {
            console.log('Serbest duyuru kanalı bulunamadı');
            return;
        }

        const releaseEmbed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.release} Oyuncu Serbest Kaldı`)
            .setDescription(`**${player.username}** serbest futbolcu oldu!`)
            .addField('🏆 Eski Kulüp', releaseData.oldClub || 'Belirtilmemiş', true)
            .addField('📋 Sebep', releaseData.reason || 'Belirtilmemiş', false)
            .addField('📅 Tarih', new Date().toLocaleDateString('tr-TR'), true)
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        if (releaseData.compensation && releaseData.compensation.trim() !== '' && releaseData.compensation !== 'Belirtilmemiş') {
            releaseEmbed.addField('💰 Tazminat', releaseData.compensation, true);
        }

        if (releaseData.newTeam && releaseData.newTeam.trim() !== '' && releaseData.newTeam !== 'Belirtilmemiş') {
            releaseEmbed.addField('🎯 Yeni Takım', releaseData.newTeam, true);
        }

        const roleData = permissions.getRoleData(guild.id);
        let mention = '';
        
        if (roleData.freeAgentPing) {
            const pingRole = guild.roles.cache.get(roleData.freeAgentPing);
            if (pingRole) {
                mention = `<@&${roleData.freeAgentPing}>`;
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
            .setPlaceholder('Örn: Lionel Messi')
            .setRequired(true);

        const salaryInput = new TextInputComponent()
            .setCustomId('salary')
            .setLabel('Maaş (Yıllık)')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 6.000.000₺/yıl')
            .setRequired(true);

        const contractInput = new TextInputComponent()
            .setCustomId('contract_duration')
            .setLabel('Sözleşme Süresi')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 2 yıl')
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
        const [playerId, presidentId] = params;
        
        const modal = new Modal()
            .setCustomId(`contract_form_${playerId}_${presidentId}`)
            .setTitle('Sözleşme Teklifi Formu');

        const transferFeeInput = new TextInputComponent()
            .setCustomId('transfer_fee')
            .setLabel('Transfer Bedeli')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 15.000.000₺')
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
            .setLabel('Sözleşme Süresi')
            .setStyle('SHORT')
            .setPlaceholder('Örn: 3 yıl')
            .setRequired(true);

        const row1 = new MessageActionRow().addComponents(transferFeeInput);
        const row2 = new MessageActionRow().addComponents(newClubInput);
        const row3 = new MessageActionRow().addComponents(salaryInput);
        const row4 = new MessageActionRow().addComponents(contractInput);

        modal.addComponents(row1, row2, row3, row4);

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
            .setLabel('Sözleşme Süresi')
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

        const row1 = new MessageActionRow().addComponents(oldClubInput);
        const row2 = new MessageActionRow().addComponents(reasonInput);
        const row3 = new MessageActionRow().addComponents(compensationInput);
        const row4 = new MessageActionRow().addComponents(newTeamInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    }
}

module.exports = ButtonHandler;