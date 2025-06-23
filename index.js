const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const commandHandler = require('./handlers/commandHandler');
const buttonHandler = require('./handlers/buttonHandler');

// Bot client oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Commands collection
client.commands = new Collection();

// Komutları yükle
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
}

// Bot hazır olduğunda
client.once('ready', () => {
    console.log('🏈 Futbol Transfer Botu aktif!');
    console.log(`🤖 ${client.user.tag} olarak giriş yapıldı`);
    client.user.setActivity('⚽ Transfer müzakereleri', { type: 3 }); // 3 = WATCHING
});

// Mesaj dinleyicisi
client.on('messageCreate', async message => {
    // Bot mesajlarını ve DM'leri yok say
    if (message.author.bot || !message.guild) return;
    
    // Prefix kontrolü
    if (!message.content.startsWith(config.prefix)) return;
    
    await commandHandler.handleCommand(client, message);
});

// Etkileşim dinleyicisi (butonlar, select menüler ve modaller)
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            await buttonHandler.handleButton(client, interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(client, interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(client, interaction);
        }
    } catch (error) {
        console.error('Etkileşim hatası:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Bir hata oluştu!', ephemeral: true });
        }
    }
});

// Select menu işleyicisi
async function handleSelectMenu(client, interaction) {
    const customId = interaction.customId;
    
    if (customId.startsWith('role_setup_')) {
        const userId = customId.split('_')[2];
        
        // Sadece komutu çalıştıran kişi seçim yapabilir
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Bu menüyü sadece komutu çalıştıran kişi kullanabilir!', ephemeral: true });
        }
        
        const roleType = interaction.values[0];
        const permissions = require('./utils/permissions');
        const { EmbedBuilder } = require('discord.js');
        const config = require('./config');
        
        // Rol türü açıklamaları
        const roleDescriptions = {
            'president': 'Takım Başkanı',
            'player': 'Futbolcu', 
            'freeAgent': 'Serbest Futbolcu',
            'transferChannel': 'Transfer Duyuru Kanalı',
            'transferAuthority': 'Transfer Yetkilisi',
            'transferPingRole': 'Transfer Duyuru Ping',
            'freeAgentPingRole': 'Serbest Duyuru Ping',
            'announcementPingRole': 'Duyur Duyuru Ping'
        };
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.edit} Rol/Kanal Ayarlama`)
            .setDescription(`**${roleDescriptions[roleType]}** için ayarlama yapmak üzeresiniz.\n\nLütfen bu mesajı yanıtlayarak aşağıdakilerden birini belirtin:\n\n${roleType === 'transferChannel' ? '• **Kanal:** #kanal-adı veya kanal ID\'si' : '• **Rol:** @rol-adı veya rol ID\'si'}`)
            .addFields({
                name: '💡 Nasıl Ayarlanır?',
                value: roleType === 'transferChannel' 
                    ? 'Bu mesajı yanıtlayarak kanal etiketini (#transfer-duyuru) veya kanal ID\'sini yazın.'
                    : 'Bu mesajı yanıtlayarak rol etiketini (@Başkan) veya rol ID\'sini yazın.',
                inline: false
            })
            .setFooter({ text: 'Ayarlama işlemini iptal etmek için başka bir komut kullanabilirsiniz.' })
            .setTimestamp();
            
        await interaction.update({ embeds: [embed], components: [] });
        
        // Mesaj filtreleme - sadece bu kullanıcıdan ve bu kanaldan
        const filter = (m) => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id;
        
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 60000, 
                errors: ['time'] 
            });
            
            const responseMessage = collected.first();
            const content = responseMessage.content.trim();
            
            if (roleType === 'transferChannel') {
                // Kanal ayarlama
                let channel = null;
                
                // Kanal mention kontrolü
                const channelMatch = content.match(/<#(\d+)>/);
                if (channelMatch) {
                    channel = interaction.guild.channels.cache.get(channelMatch[1]);
                } else {
                    // ID veya isim ile arama
                    channel = interaction.guild.channels.cache.get(content) || 
                             interaction.guild.channels.cache.find(ch => ch.name.toLowerCase() === content.toLowerCase());
                }
                
                if (!channel) {
                    return responseMessage.reply('❌ Kanal bulunamadı! Lütfen geçerli bir kanal etiket (#kanal) veya ID belirtin.');
                }
                
                if (!channel.isTextBased()) {
                    return responseMessage.reply('❌ Sadece metin kanalları seçilebilir!');
                }
                
                // Kanal ayarını kaydet
                permissions.setRole(interaction.guild.id, roleType, channel.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.check} Kanal Ayarlandı`)
                    .setDescription(`**Transfer Duyuru Kanalı** başarıyla ${channel} olarak ayarlandı!`)
                    .setTimestamp();
                    
                await responseMessage.reply({ embeds: [successEmbed] });
                
            } else {
                // Rol ayarlama
                let role = null;
                
                // Rol mention kontrolü
                const roleMatch = content.match(/<@&(\d+)>/);
                if (roleMatch) {
                    role = interaction.guild.roles.cache.get(roleMatch[1]);
                } else {
                    // ID veya isim ile arama
                    role = interaction.guild.roles.cache.get(content) || 
                          interaction.guild.roles.cache.find(r => r.name.toLowerCase() === content.toLowerCase());
                }
                
                if (!role) {
                    return responseMessage.reply('❌ Rol bulunamadı! Lütfen geçerli bir rol etiket (@rol) veya ID belirtin.');
                }
                
                // Rol ayarını kaydet
                permissions.setRole(interaction.guild.id, roleType, role.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.check} Rol Ayarlandı`)
                    .setDescription(`**${roleDescriptions[roleType]}** rolü başarıyla ${role} olarak ayarlandı!`)
                    .setTimestamp();
                    
                await responseMessage.reply({ embeds: [successEmbed] });
            }
            
        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.cross} Zaman Aşımı`)
                .setDescription('Rol/kanal ayarlama işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.')
                .setTimestamp();
                
            await interaction.followUp({ embeds: [timeoutEmbed] });
        }
    }
}

// Modal submission işleyicisi
async function handleModalSubmit(client, interaction) {
    try {
        // Hemen defer et - 3 dakika timeout sorunu için
        await interaction.deferReply({ ephemeral: true });
        
        const customId = interaction.customId;
        const { ModalBuilder, TextInputBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
        const embeds = require('./utils/embeds');
        const channels = require('./utils/channels');
        const config = require('./config');
        
        console.log('Modal submission received:', customId);

        // Offer form modali
        if (customId.startsWith('offer_form_')) {
            const [, , playerId, presidentId] = customId.split('_');
            const player = interaction.guild.members.cache.get(playerId);
            const president = interaction.guild.members.cache.get(presidentId);

            if (!player || !president) {
                return interaction.editReply({ content: '❌ Kullanıcılar bulunamadı!' });
            }

            // Form verilerini al
            const offerData = {
                newTeam: interaction.fields.getTextInputValue('new_team') || '',
                oldClub: interaction.fields.getTextInputValue('old_club') || '',
                salary: interaction.fields.getTextInputValue('salary') || '6.000.000₺/yıl',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || '2 yıl',
                bonus: interaction.fields.getTextInputValue('bonus') || '3.000.000₺'
            };

            // Teklif embed'i oluştur
            const offerEmbed = embeds.createOfferForm(president.user, player.user, offerData);
            
            // Butonları oluştur
            const row = new ActionRowBuilder()
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

            // Müzakere kanalı oluştur
            const negotiationChannel = await channels.createNegotiationChannel(
                interaction.guild, 
                president.user, 
                player.user,
                'offer'
            );

            if (!negotiationChannel) {
                return interaction.editReply({ content: '❌ Müzakere kanalı oluşturulamadı!' });
            }

            // Teklifi kanala gönder
            await negotiationChannel.send({
                content: `${config.emojis.football} **Yeni Transfer Teklifi**\n${player.user}, ${president.user} sizden bir teklif var!`,
                embeds: [offerEmbed],
                components: [row]
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Teklif Gönderildi`)
                .setDescription(`${player.user} için teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        }
    
    // Contract form modali
    else if (customId.startsWith('contract_form_')) {
        const [, , targetPresidentId, fromPresidentId, playerId] = customId.split('_');
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.editReply({ content: '❌ Kullanıcılar bulunamadı!' });
        }

        // Form verilerini al
        const contractData = {
            newClub: interaction.fields.getTextInputValue('new_club') || 'Belirtilmemiş',
            oldClub: interaction.fields.getTextInputValue('old_club') || '',
            transferFee: interaction.fields.getTextInputValue('transfer_fee') || '2.500.000₺',
            salary: interaction.fields.getTextInputValue('salary') || '24.000.000₺/yıl',
            contractDuration: interaction.fields.getTextInputValue('contract_duration') || '3 yıl'
        };

        // Sözleşme embed'i oluştur
        const contractEmbed = embeds.createContractForm(fromPresident.user, targetPresident.user, player.user, contractData);
        
        // Butonları oluştur
        const row = new ActionRowBuilder()
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
                    .setEmoji(config.emojis.cross)
            );

        // Müzakere kanalı oluştur
        const negotiationChannel = await channels.createNegotiationChannel(
            interaction.guild, 
            fromPresident.user, 
            targetPresident.user,
            'contract',
            player.user
        );

        if (!negotiationChannel) {
            return interaction.editReply({ content: '❌ Müzakere kanalı oluşturulamadı!' });
        }

        // Sözleşme teklifini kanala gönder
        await negotiationChannel.send({
            content: `${config.emojis.contract} **Yeni Sözleşme Teklifi**\n${targetPresident.user}, ${fromPresident.user} sizden bir sözleşme teklifi var!\n\n**Oyuncu:** ${player.user}`,
            embeds: [contractEmbed],
            components: [row]
        });

        // Başarı mesajı
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} Sözleşme Teklifi Gönderildi`)
            .setDescription(`${player.user} için sözleşme teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
    }

    // Trade form modali
    else if (customId.startsWith('trade_form_')) {
        const [, , targetPresidentId, fromPresidentId, playerId] = customId.split('_');
        const targetPresident = interaction.guild.members.cache.get(targetPresidentId);
        const fromPresident = interaction.guild.members.cache.get(fromPresidentId);
        const player = interaction.guild.members.cache.get(playerId);

        if (!targetPresident || !fromPresident || !player) {
            return interaction.editReply({ content: '❌ Kullanıcılar bulunamadı!' });
        }

        // Form verilerini al
        const tradeData = {
            playerName: interaction.fields.getTextInputValue('player_name') || '',
            additionalAmount: interaction.fields.getTextInputValue('additional_amount') || '0',
            salary: interaction.fields.getTextInputValue('salary') || '10.000.000₺/yıl',
            contractDuration: interaction.fields.getTextInputValue('contract_duration') || '4 yıl',
            targetPlayer: interaction.fields.getTextInputValue('target_player') || 'Belirtilmedi'
        };

        // Takas embed'i oluştur
        const tradeEmbed = embeds.createTradeForm(fromPresident.user, targetPresident.user, player.user, tradeData);
        
        // Butonları oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`trade_accept_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                    .setLabel('Kabul Et')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.emojis.check),
                new ButtonBuilder()
                    .setCustomId(`trade_reject_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                    .setLabel('Reddet')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.emojis.cross),
                new ButtonBuilder()
                    .setCustomId(`trade_edit_${targetPresidentId}_${fromPresidentId}_${playerId}`)
                    .setLabel('Düzenle')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(config.emojis.edit)
            );

        // Müzakere kanalı oluştur
        const negotiationChannel = await channels.createNegotiationChannel(
            interaction.guild, 
            fromPresident.user, 
            targetPresident.user,
            'trade',
            player.user
        );

        if (!negotiationChannel) {
            return interaction.editReply({ content: '❌ Müzakere kanalı oluşturulamadı!' });
        }

        // Takas teklifini kanala gönder
        await negotiationChannel.send({
            content: `${config.emojis.transfer} **Yeni Takas Teklifi**\n${targetPresident.user}, ${fromPresident.user} sizden bir takas teklifi var!\n\n**Oyuncu:** ${player.user}`,
            embeds: [tradeEmbed],
            components: [row]
        });

        // Başarı mesajı
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} Takas Teklifi Gönderildi`)
            .setDescription(`${player.user} için takas teklifiniz hazırlandı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
    }

    // Release form modali (Karşılıklı fesih)
    else if (customId.startsWith('release_form_')) {
        const [, , playerId, presidentId, releaseType] = customId.split('_');
        const player = interaction.guild.members.cache.get(playerId);
        const president = interaction.guild.members.cache.get(presidentId);

        if (!player || !president) {
            return interaction.editReply({ content: '❌ Kullanıcılar bulunamadı!' });
        }

        // Form verilerini al
        const releaseData = {
            oldClub: interaction.fields.getTextInputValue('old_club') || '',
            compensation: interaction.fields.getTextInputValue('compensation') || '0₺',
            reason: interaction.fields.getTextInputValue('reason') || 'Karşılıklı anlaşma ile ayrılık',
            newTeam: interaction.fields.getTextInputValue('new_team') || 'Henüz belirlenmedi',
            bonus: interaction.fields.getTextInputValue('bonus') || '0₺'
        };

        // Karşılıklı fesih embed'i oluştur
        const releaseEmbed = embeds.createReleaseForm(president.user, player.user, 'karşılıklı', releaseData);
        
        // Butonları oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`release_accept_${playerId}_${presidentId}`)
                    .setLabel('Kabul Et')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.emojis.check),
                new ButtonBuilder()
                    .setCustomId(`release_reject_${playerId}_${presidentId}`)
                    .setLabel('Reddet')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.emojis.cross)
            );

        // Müzakere kanalı oluştur
        const negotiationChannel = await channels.createNegotiationChannel(
            interaction.guild, 
            president.user, 
            player.user,
            'release'
        );

        if (!negotiationChannel) {
            return interaction.editReply({ content: '❌ Müzakere kanalı oluşturulamadı!' });
        }

        // Karşılıklı fesih teklifini kanala gönder
        await negotiationChannel.send({
            content: `${config.emojis.release} **Karşılıklı Fesih Teklifi**\n${player.user}, ${president.user} sizinle karşılıklı fesih yapmak istiyor!`,
            embeds: [releaseEmbed],
            components: [row]
        });

        // Futbolcuya bildirim gönder
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.release} Karşılıklı Fesih Teklifi`)
                .setDescription(`**${interaction.guild.name}** sunucusunda **${president.user.username}** sizinle karşılıklı fesih yapmak istiyor!\n\nTeklifi değerlendirmek için sunucuya göz atın.`)
                .setTimestamp();

            await player.user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('DM gönderilemedi:', error.message);
        }

        // Başarı mesajı
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} Karşılıklı Fesih Teklifi Gönderildi`)
            .setDescription(`${player.user} için karşılıklı fesih teklifiniz gönderildi!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
    }

    // Announcement form modali
    else if (customId.startsWith('announcement_form_')) {
        const [, , playerId] = customId.split('_');
        const player = interaction.guild.members.cache.get(playerId);

        if (!player) {
            return interaction.editReply({ content: '❌ Kullanıcı bulunamadı!' });
        }

        // Form verilerini al
        const announcementData = {
            playerName: interaction.fields.getTextInputValue('player_name'),
            newClub: interaction.fields.getTextInputValue('new_club'),
            salary: interaction.fields.getTextInputValue('salary'),
            contractYears: interaction.fields.getTextInputValue('contract_years'),
            signingBonus: interaction.fields.getTextInputValue('signing_bonus')
        };

        // Duyuru kanalını bul
        const channels = require('./utils/channels');
        const announcementChannel = await channels.findAnnouncementChannel(interaction.guild);
        
        if (!announcementChannel) {
            return interaction.editReply({ 
                content: '❌ Duyuru kanalı ayarlanmamış! Lütfen önce `.duyur-ayarla #kanal` komutunu kullanın.' 
            });
        }

        // Duyuru embed'i oluştur
        const announcementEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Serbest Futbolcu Duyurusu`)
            .setDescription(`**${announcementData.playerName}** ${announcementData.newClub} takımına transfer oldu!`)
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '⚽ Oyuncu', value: `${player} (${announcementData.playerName})`, inline: true },
                { name: '🏆 Yeni Kulüp', value: announcementData.newClub, inline: true },
                { name: '💰 Maaş', value: announcementData.salary, inline: true }
            );

        // Sadece dolu alanları ekle
        if (announcementData.contractYears && announcementData.contractYears.trim()) {
            announcementEmbed.addFields({ name: '📅 Sözleşme Yılı', value: announcementData.contractYears, inline: true });
        }
        if (announcementData.signingBonus && announcementData.signingBonus.trim()) {
            announcementEmbed.addFields({ name: '💎 Bonus', value: announcementData.signingBonus, inline: true });
        }

        announcementEmbed
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi', iconURL: interaction.guild.iconURL() });

        // Ping rolünü al
        const fs = require('fs');
        const path = require('path');
        const rolesPath = path.join(__dirname, 'data/roles.json');
        
        let pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU** ${config.emojis.football}`;
        
        try {
            const allData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
            const guildData = allData[interaction.guild.id];
            
            if (guildData && guildData.announcementPingRole) {
                const pingRole = interaction.guild.roles.cache.get(guildData.announcementPingRole);
                if (pingRole) {
                    pingContent = `${config.emojis.football} **YENİ SERBEST FUTBOLCU DUYURUSU** ${config.emojis.football}\n${pingRole}`;
                }
            }
        } catch (error) {
            console.log('Ping rol bulunamadı:', error.message);
        }

        // Duyuruyu gönder
        await announcementChannel.send({
            content: pingContent,
            embeds: [announcementEmbed]
        });

        // Başarı mesajı
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} Duyuru Gönderildi`)
            .setDescription(`Duyurunuz başarıyla ${announcementChannel} kanalına gönderildi!`)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });
    }
    } catch (error) {
        console.error('Modal submission error:', error);
        if (interaction.deferred) {
            await interaction.editReply({ 
                content: '❌ Modal işlenirken hata oluştu! Lütfen tekrar deneyin.' 
            });
        } else if (!interaction.replied) {
            await interaction.reply({ 
                content: '❌ Modal işlenirken hata oluştu! Lütfen tekrar deneyin.', 
                ephemeral: true 
            });
        }
    }
}

// Hata yönetimi
client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Bot'u başlat
client.login(process.env.DISCORD_TOKEN);
