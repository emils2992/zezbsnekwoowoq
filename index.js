const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const CommandHandler = require('./handlers/commandHandler');
const ButtonHandler = require('./handlers/buttonHandler');

// Handler instances oluştur
const commandHandler = new CommandHandler();
const buttonHandler = new ButtonHandler();

// Bot client oluştur - Aggressive rate limit bypass
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ],
    restTimeOffset: 500,
    restRequestTimeout: 60000,
    retryLimit: 10,
    restGlobalTimeout: 60000,
    restSweepInterval: 60
});

// Commands collection
client.commands = new Collection();

// Komutları yükle
console.log('📁 Komutlar yukleniyor...');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        client.commands.set(command.name, command);
        console.log(`✅ Komut yuklendi: ${command.name}`);
    } catch (error) {
        console.error(`❌ Komut yuklenemedi (${file}):`, error.message);
    }
}

console.log(`📋 Toplam ${client.commands.size} komut yuklendi`);

// Bot hazır olduğunda
client.once('ready', () => {
    console.log('🏈 Futbol Transfer Botu aktif!');
    console.log(`🤖 ${client.user.tag} olarak giris yapildi`);
    console.log(`📊 Sunucu sayisi: ${client.guilds.cache.size}`);
    console.log(`👥 Kullanici sayisi: ${client.users.cache.size}`);
    client.user.setActivity('⚽ Transfer müzakereleri', { type: 3 }); // 3 = WATCHING
});

// Hata yakalama
client.on('error', error => {
    console.error('❌ Discord client hatasi:', error.message);
});

client.on('warn', info => {
    console.warn('⚠️ Discord uyarisi:', info);
});

client.on('debug', info => {
    if (info.includes('Heartbeat') || info.includes('latency')) return;
    if (info.includes('429')) {
        console.log('🚫 API rate limit - bekleniyor...');
        return;
    }
    if (info.includes('Session') || info.includes('Ready')) {
        console.log('📡 Discord session:', info);
    }
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
    if (interaction.isButton()) {
        try {
            // Handle role selection buttons
            if (interaction.customId.startsWith('role_select_') || 
                interaction.customId === 'role_list' || 
                interaction.customId === 'role_reset') {
                await handleRoleButtons(client, interaction);
            } else {
                await buttonHandler.handleButton(client, interaction);
            }
        } catch (error) {
            console.error('Button interaction error:', error);
        }
    } else if (interaction.isSelectMenu()) {
        try {
            await handleSelectMenu(client, interaction);
        } catch (error) {
            console.error('Select menu error:', error);
        }
    } else if (interaction.isModalSubmit()) {
        try {
            await handleModalSubmit(client, interaction);
        } catch (error) {
            console.error('Modal submit error:', error);
        }
    }
});

// Select menu işleyicisi
async function handleRoleButtons(client, interaction) {
    const permissions = require('./utils/permissions');
    const { MessageEmbed } = require('discord.js');
    const config = require('./config');

    // Yetki kontrolü
    if (!permissions.isTransferAuthority(interaction.member) && !interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({
            content: '❌ Bu işlemi sadece transfer yetkilileri veya yöneticiler yapabilir!',
            ephemeral: true
        });
    }

    if (interaction.customId === 'role_list') {
        // Show role list
        const roleData = permissions.getRoleData(interaction.guild.id);
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle('📋 Mevcut Rol Ayarları')
            .setDescription('Sunucuda ayarlanan roller:')
            .addFields(
                { name: '👑 Başkan Rolü', value: roleData.president ? `<@&${roleData.president}>` : 'Ayarlanmamış', inline: true },
                { name: '⚽ Futbolcu Rolü', value: roleData.player ? `<@&${roleData.player}>` : 'Ayarlanmamış', inline: true },
                { name: '🆓 Serbest Futbolcu', value: roleData.freeAgent ? `<@&${roleData.freeAgent}>` : 'Ayarlanmamış', inline: true },
                { name: '🔧 Transfer Yetkili', value: roleData.transferAuthority ? `<@&${roleData.transferAuthority}>` : 'Ayarlanmamış', inline: true },
                { name: '📢 Transfer Ping', value: roleData.tfPingRole ? `<@&${roleData.tfPingRole}>` : 'Ayarlanmamış', inline: true },
                { name: '🔔 Serbest Ping', value: roleData.serbestPingRole ? `<@&${roleData.serbestPingRole}>` : 'Ayarlanmamış', inline: true },
                { name: '📣 Duyuru Ping', value: roleData.duyurPingRole ? `<@&${roleData.duyurPingRole}>` : 'Ayarlanmamış', inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === 'role_reset') {
        permissions.resetRoles(interaction.guild.id);
        return interaction.reply({
            content: '✅ Tüm rol ayarları sıfırlandı!',
            ephemeral: true
        });
    }

    // Handle role selection
    const roleType = interaction.customId.replace('role_select_', '');
    const roleNames = {
        'baskan': 'Başkan Rolü',
        'futbolcu': 'Futbolcu Rolü', 
        'serbest': 'Serbest Futbolcu Rolü',
        'yetkili': 'Transfer Yetkili Rolü',
        'ping_tf': 'Transfer Ping Rolü',
        'ping_serbest': 'Serbest Ping Rolü',
        'ping_duyur': 'Duyuru Ping Rolü'
    };

    await interaction.reply({
        content: `🎭 **${roleNames[roleType]}** ayarlama için rol etiketleyin veya rol ID'sini yazın.\n\nÖrnek: \`@Başkan\` veya \`1234567890\`\n\n*60 saniye içinde yanıtlayın...*`,
        ephemeral: false
    });

    // Wait for role mention or ID
    const filter = m => m.author.id === interaction.user.id;
    try {
        const collected = await interaction.channel.awaitMessages({ 
            filter, 
            max: 1, 
            time: 60000, 
            errors: ['time'] 
        });

        const message = collected.first();
        let roleId = null;

        // Check for role mention
        if (message.mentions.roles.size > 0) {
            roleId = message.mentions.roles.first().id;
        } else {
            // Check for role ID or name
            const content = message.content.trim();
            
            // Try as ID first
            if (/^\d+$/.test(content)) {
                const role = interaction.guild.roles.cache.get(content);
                if (role) roleId = content;
            } else {
                // Try as role name
                const role = interaction.guild.roles.cache.find(r => 
                    r.name.toLowerCase() === content.toLowerCase()
                );
                if (role) roleId = role.id;
            }
        }

        if (!roleId) {
            return message.reply('❌ Geçerli bir rol bulunamadı! Rol etiketleyin, ID yazın veya doğru rol adını girin.');
        }

        // Set the role
        const roleTypeMapping = {
            'baskan': 'president',
            'futbolcu': 'player',
            'serbest': 'freeAgent', 
            'yetkili': 'transferAuthority',
            'ping_tf': 'tfPingRole',
            'ping_serbest': 'serbestPingRole',
            'ping_duyur': 'duyurPingRole'
        };

        const mappedType = roleTypeMapping[roleType];
        if (mappedType) {
            permissions.setRole(interaction.guild.id, mappedType, roleId);
            const role = interaction.guild.roles.cache.get(roleId);
            await message.reply(`✅ **${roleNames[roleType]}** ${role} olarak ayarlandı!`);
        }

    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            await interaction.followUp({
                content: '❌ Zaman aşımı! 60 saniye içinde yanıt verilmedi.',
                ephemeral: true
            });
        } else {
            console.error('Role setup error:', error);
        }
    }
}

async function handleSelectMenu(client, interaction) {
    const customId = interaction.customId;
    
    if (customId.startsWith('role_select_')) {
        const roleType = customId.split('_')[2];
        const selectedRoleId = interaction.values[0];
        
        const permissions = require('./utils/permissions');
        const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
        
        try {
            // Seçilen rolü al
            const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
            
            if (!selectedRole) {
                return interaction.reply({
                    content: '❌ Seçilen rol bulunamadı!',
                    ephemeral: true
                });
            }

            // Rol ayarını kaydet
            permissions.setRole(interaction.guild.id, roleType, selectedRoleId);
            
            // Başarı mesajı
            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Rol Başarıyla Ayarlandı')
                .setDescription(`**${getRoleName(roleType)}** olarak ${selectedRole} rolü ayarlandı!`)
                .addField('📊 Rol Bilgileri', `**Rol Adı:** ${selectedRole.name}\n**Üye Sayısı:** ${selectedRole.members.size}\n**Renk:** ${selectedRole.hexColor}`, false)
                .setTimestamp();

            // Geri dön butonu
            const backButton = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('role_setup_back_main')
                        .setLabel('Ana Menüye Dön')
                        .setStyle('PRIMARY')
                        .setEmoji('🏠'),
                    new MessageButton()
                        .setCustomId('role_back')
                        .setLabel('Mevcut Rolleri Göster')
                        .setStyle('SECONDARY')
                        .setEmoji('📋')
                );

            await interaction.update({
                embeds: [successEmbed],
                components: [backButton]
            });

        } catch (error) {
            console.error('Rol ayarlama hatası:', error);
            await interaction.reply({
                content: '❌ Rol ayarlanırken bir hata oluştu!',
                ephemeral: true
            });
        }
    }
}

// Rol ismi helper fonksiyonu
function getRoleName(roleType) {
    const names = {
        'president': 'Başkan Rolü',
        'player': 'Futbolcu Rolü',
        'freeAgent': 'Serbest Futbolcu Rolü',
        'transferAuthority': 'Transfer Yetkili Rolü',
        'transferPingRole': 'Transfer Duyuru Ping Rolü',
        'freeAgentPingRole': 'Serbest Duyuru Ping Rolü',
        'announcementPingRole': 'Duyur Duyuru Ping Rolü'
    };
    return names[roleType] || 'Bilinmeyen Rol';
}

// Modal submission işleyicisi
async function handleModalSubmit(client, interaction) {
    try {
        // Check if we can defer the interaction
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ ephemeral: true });
        } else {
            console.log('Interaction already handled, state:', {
                replied: interaction.replied,
                deferred: interaction.deferred
            });
        }
        
        const customId = interaction.customId;
        const embeds = require('./utils/embeds');
        const channels = require('./utils/channels');
        const config = require('./config');
        const { MessageActionRow, MessageButton } = require('discord.js');
        
        console.log('Modal submission received:', customId);

        // Offer form modali
        if (customId.startsWith('offer_form_')) {
            const [, , playerId, presidentId] = customId.split('_');
            const player = interaction.guild.members.cache.get(playerId);
            const president = interaction.guild.members.cache.get(presidentId);

            if (!player || !president) {
                return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
            }

            const offerData = {
                oldClub: interaction.fields.getTextInputValue('old_club') || 'Serbest Futbolcu',
                newTeam: interaction.fields.getTextInputValue('new_team') || 'Belirtilmemiş',
                salary: interaction.fields.getTextInputValue('salary') || '6.000.000₺/yıl',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || '2 yıl + bonuslar',
                bonus: interaction.fields.getTextInputValue('bonus') || '3.000.000₺'
            };

            // Check if we're already in a negotiation channel
            const isNegotiationChannel = interaction.channel.name && 
                (interaction.channel.name.includes('teklif-') || 
                 interaction.channel.name.includes('sozlesme-') || 
                 interaction.channel.name.includes('takas-') ||
                 interaction.channel.name.includes('kirali-') ||
                 interaction.channel.name.includes('fesih-'));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const offerEmbed = embeds.createOfferForm(president.user, player.user, offerData);
                
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

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('offer_'))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [offerEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Teklif formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {


                // Create new negotiation channel only if not in a negotiation channel
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, player.user, 'offer');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Teklif embed'i oluştur
                const offerEmbed = embeds.createOfferForm(president.user, player.user, offerData);
                
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

                await interaction.editReply({ content: `✅ Teklif müzakeresi ${channel} kanalında başlatıldı!` });
            }
        }

        // Release form modali
        else if (customId.startsWith('release_form_')) {
            const parts = customId.split('_');
            const playerId = parts[2];
            const presidentId = parts[3];
            const releaseType = parts[4];
            
            const player = interaction.guild.members.cache.get(playerId);
            const president = interaction.guild.members.cache.get(presidentId);

            if (!player || !president) {
                return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
            }

            const releaseData = {
                oldClub: interaction.fields.getTextInputValue('old_club') || '',
                reason: interaction.fields.getTextInputValue('reason') || '',
                compensation: interaction.fields.getTextInputValue('compensation') || '',
                newTeam: interaction.fields.getTextInputValue('new_team') || ''
            };

            // Check if we're in a negotiation channel (editing existing form)
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("fesih") || interaction.channel.name.includes("release") || 
                 interaction.channel.name.includes("muzakere"));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const releaseEmbed = embeds.createReleaseForm(president.user, player.user, releaseType, releaseData);
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`release_accept_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`release_reject_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`release_edit_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('release_'))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [releaseEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Fesih formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {


                // Create new negotiation channel only if not in a negotiation channel
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, player.user, 'release');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Fesih embed'i oluştur
                const releaseEmbed = embeds.createReleaseForm(president.user, player.user, releaseType, releaseData);
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`release_accept_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`release_reject_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`release_edit_${playerId}_${presidentId}_${releaseType}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                await channel.send({
                    embeds: [releaseEmbed],
                    components: [buttons]
                });

                await interaction.editReply({ content: `✅ Fesih müzakeresi ${channel} kanalında başlatıldı!` });
            }
        }

        // Contract form modali
        else if (customId.startsWith('contract_form_')) {
            const parts = customId.split('_');
            console.log('Contract form parts:', parts);
            const targetPresidentId = parts[2];
            const playerId = parts[3];
            const presidentId = parts[4];
            
            if (!targetPresidentId || !playerId || !presidentId) {
                console.error('Missing contract parameters:', { targetPresidentId, playerId, presidentId });
                return interaction.editReply({ content: 'Parametre hatası! Lütfen komutu tekrar deneyin.' });
            }
            
            console.log(`Contract form - Target President ID: ${targetPresidentId}, Player ID: ${playerId}, President ID: ${presidentId}`);
            
            let player, president, targetPresident;
            try {
                player = await interaction.guild.members.fetch(playerId);
                president = await interaction.guild.members.fetch(presidentId);
                targetPresident = await interaction.guild.members.fetch(targetPresidentId);
            } catch (error) {
                console.error('Error fetching members:', error);
                return interaction.editReply({ content: 'Kullanıcılar bulunamadı! Lütfen tekrar deneyin.' });
            }

            if (!player || !president || !targetPresident) {
                return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
            }

            const contractData = {
                transferFee: interaction.fields.getTextInputValue('transfer_fee') || '',
                oldClub: interaction.fields.getTextInputValue('old_club') || '',
                newClub: interaction.fields.getTextInputValue('new_club') || '',
                salary: interaction.fields.getTextInputValue('salary') || '',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || ''
            };

            // Check if we're in a negotiation channel (editing existing form)
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("sozlesme") || interaction.channel.name.includes("contract") || 
                 interaction.channel.name.includes("muzakere") || interaction.channel.name.includes("m-zakere"));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const contractEmbed = embeds.createContractForm(president.user, targetPresident.user, player.user, contractData);
                
                // Check if this is a player channel (m-zakere) or president channel
                const isPlayerChannel = interaction.channel.name.includes("m-zakere");
                
                const buttons = new MessageActionRow();
                
                if (isPlayerChannel) {
                    // Player channel - use contract_player_ buttons
                    buttons.addComponents(
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
                } else {
                    // President channel - use regular contract_ buttons
                    buttons.addComponents(
                        new MessageButton()
                            .setCustomId(`contract_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`contract_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`contract_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );
                }

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 15 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    (msg.components[0].components.some(btn => btn.customId && btn.customId.includes('contract_')) ||
                     msg.embeds[0].title?.includes('Sözleşme') || 
                     msg.embeds[0].fields?.some(field => field.name.includes('Transfer')))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [contractEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Sözleşme formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {


                // Create new negotiation channel only if not in a negotiation channel
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, targetPresident.user, 'contract');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Sözleşme embed'i oluştur
                const contractEmbed = embeds.createContractForm(president.user, targetPresident.user, player.user, contractData);
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`contract_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`contract_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`contract_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                await channel.send({
                    embeds: [contractEmbed],
                    components: [buttons]
                });

                await interaction.editReply({ content: `✅ Sözleşme müzakeresi ${channel} kanalında başlatıldı!` });
            }
        }

        // Trade form modali
        else if (customId.startsWith('trade_form_')) {
            console.log('Trade form submission started:', customId);
            const [, , targetPresidentId, wantedPlayerId, givenPlayerId, presidentId] = customId.split('_');
            console.log('Parsed IDs:', { targetPresidentId, wantedPlayerId, givenPlayerId, presidentId });
            
            try {
                // Check if interaction is still valid
                if (interaction.replied && !interaction.deferred) {
                    console.log('Interaction already replied, cannot process');
                    return;
                }

                const targetPresident = await interaction.guild.members.fetch(targetPresidentId);
                const wantedPlayer = await interaction.guild.members.fetch(wantedPlayerId);
                const givenPlayer = await interaction.guild.members.fetch(givenPlayerId);
                const president = await interaction.guild.members.fetch(presidentId);

                console.log('Found users:', {
                    targetPresident: targetPresident?.user.username,
                    wantedPlayer: wantedPlayer?.user.username,
                    givenPlayer: givenPlayer?.user.username,
                    president: president?.user.username
                });

                if (!targetPresident || !wantedPlayer || !givenPlayer || !president) {
                    console.log('Missing users error');
                    return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
                }

            const tradeData = {
                additionalAmount: interaction.fields.getTextInputValue('additional_amount') || '',
                bonus: interaction.fields.getTextInputValue('bonus') || '',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || ''
            };

            // Check if we're in a negotiation channel (editing existing form)
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("takas") || interaction.channel.name.includes("trade") || interaction.channel.name.includes("muzakere"));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const tradeEmbed = embeds.createTradeForm(president.user, targetPresident.user, wantedPlayer.user, tradeData);
                tradeEmbed.addFields(
                    { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true }
                );
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`trade_accept_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`trade_reject_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`trade_edit_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('trade_'))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [tradeEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Takas formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {
                // İlk başkan ile hedef başkan arasında müzakere kanalı oluştur
                console.log('Creating trade channel for:', president.user.username, 'and', targetPresident.user.username);
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, targetPresident.user, 'trade');
                console.log('Channel creation result:', channel ? channel.name : 'FAILED');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Takas embed'i oluştur
                const tradeEmbed = embeds.createTradeForm(president.user, targetPresident.user, wantedPlayer.user, tradeData);
                tradeEmbed.addFields(
                    { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true }
                );
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`trade_accept_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`trade_reject_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`trade_edit_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                await channel.send({
                    embeds: [tradeEmbed],
                    components: [buttons]
                });

                await interaction.editReply({ content: `✅ Takas müzakeresi ${channel} kanalında başlatıldı!\n\n${targetPresident.user} ${president.user} - Lütfen ${channel} kanalına gidin ve müzakereyi tamamlayın.` });
            }
            } catch (error) {
                console.error('Trade form submission error:', error);
                return interaction.editReply({ content: 'Kullanıcılar getirilirken hata oluştu!' });
            }
        }

        // Hire form modali
        else if (customId.startsWith('hire_form_')) {
            console.log('Hire form submission started:', customId);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply({ ephemeral: true });
                    console.log('✅ Hire form interaction deferred');
                }

            const params = customId.split('_');
            const targetPresidentId = params[2];
            const playerId = params[3];  
            const presidentId = params[4];

            console.log('Parsed IDs:', { targetPresidentId, playerId, presidentId });

            const guild = interaction.guild;
            const targetPresident = await guild.members.fetch(targetPresidentId);
            const player = await guild.members.fetch(playerId);
            const president = await guild.members.fetch(presidentId);

            console.log('Found users:', {
                targetPresident: targetPresident.displayName,
                player: player.displayName,
                president: president.displayName
            });

            if (!targetPresident || !player || !president) {
                console.log('Missing users error');
                return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
            }

            const hireData = {
                loanFee: interaction.fields.getTextInputValue('loan_fee') || '',
                oldClub: interaction.fields.getTextInputValue('old_club') || '',
                newClub: interaction.fields.getTextInputValue('new_club') || '',
                salary: interaction.fields.getTextInputValue('salary') || '',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || ''
            };

            // Always check if we're in a negotiation channel first (editing existing form)
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("kiralik") || interaction.channel.name.includes("hire") || 
                 interaction.channel.name.includes("muzakere") || interaction.channel.name.includes("m-zakere"));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const hireEmbed = embeds.createHireForm(president.user, targetPresident.user, player.user, hireData);
                
                // Check if this is a player channel (m-zakere) or president channel
                const isPlayerChannel = interaction.channel.name.includes("m-zakere");
                
                const buttons = new MessageActionRow();
                
                if (isPlayerChannel) {
                    // Player channel - use hire_player_ buttons
                    buttons.addComponents(
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
                } else {
                    // President channel - use regular hire_ buttons
                    buttons.addComponents(
                        new MessageButton()
                            .setCustomId(`hire_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`hire_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`hire_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );
                }

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    (msg.embeds[0].title && msg.embeds[0].title.includes('Kiralık') || 
                     msg.components[0].components.some(btn => btn.customId && (btn.customId.includes('hire_') || btn.customId.includes('hire_player_'))))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [hireEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Kiralık formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {


                // İlk başkan ile hedef başkan arasında müzakere kanalı oluştur
                console.log('Creating hire channel for:', president.displayName, 'and', targetPresident.displayName);
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, targetPresident.user, 'hire');
                console.log('Channel creation result:', channel ? channel.name : 'FAILED');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Kiralık embed'i oluştur
                const hireEmbed = embeds.createHireForm(president.user, targetPresident.user, player.user, hireData);
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`hire_accept_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`hire_reject_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`hire_edit_${targetPresidentId}_${playerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                await channel.send({
                    embeds: [hireEmbed],
                    components: [buttons]
                });

                await interaction.editReply({ content: `✅ Kiralık müzakeresi ${channel} kanalında başlatıldı!\n\n${targetPresident.user} ${president.user} - Lütfen ${channel} kanalına gidin ve müzakereyi tamamlayın.` });
            }
            } catch (error) {
                console.error('Hire form submission error:', error);
                return interaction.editReply({ content: 'Kullanıcılar getirilirken hata oluştu!' });
            }
        }

        // Announcement form modali
        else if (customId.startsWith('announcement_form_')) {
            const [, , userId] = customId.split('_');
            const user = interaction.guild.members.cache.get(userId);

            if (!user) {
                return interaction.editReply({ content: 'Kullanıcı bulunamadı!' });
            }

            const announcementData = {
                desire: interaction.fields.getTextInputValue('desire') || '',
                teamRole: interaction.fields.getTextInputValue('team_role') || '',
                salary: interaction.fields.getTextInputValue('salary') || '',
                contract: interaction.fields.getTextInputValue('contract') || '',
                bonus: interaction.fields.getTextInputValue('bonus') || ''
            };

            // Duyuru kanalını bul
            const channels = require('./utils/channels');
            const announcementChannel = await channels.findAnnouncementChannel(interaction.guild);
            
            if (!announcementChannel) {
                return interaction.editReply({ content: '❌ Duyuru kanalı ayarlanmamış! `.duyur-ayarla #kanal` komutuyla ayarlayın.' });
            }

            // Duyuru embed'i oluştur
            const { MessageEmbed } = require('discord.js');
            const announcementEmbed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle('📢 Futbolcu Duyurusu')
                .setDescription(`**${user.displayName}** duyuru yaptı:`)
                .addFields(
                    { name: '⚽ Futbolcu', value: `${user}`, inline: true },
                    { name: '🎯 Ne İsterim', value: announcementData.desire, inline: false },
                    { name: '🏟️ Takımdaki Rolüm', value: announcementData.teamRole, inline: true },
                    { name: '💰 Maaş Beklentim', value: announcementData.salary, inline: true },
                    { name: '📅 Sözleşme Tercihi', value: announcementData.contract, inline: true }
                );

            if (announcementData.bonus && announcementData.bonus.trim() !== '') {
                announcementEmbed.addFields({ name: '🎯 Bonus Beklentileri', value: announcementData.bonus, inline: true });
            }

            announcementEmbed
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Ping rolü kontrolü - duyuru için announcementPingRole kullan
            const permissions = require('./utils/permissions');
            const roleData = permissions.getRoleData(interaction.guild.id);
            let mention = '';
            
            // Only use duyurPingRole for manual announcements (.duyur command)
            if (roleData.duyurPingRole) {
                const pingRole = interaction.guild.roles.cache.get(roleData.duyurPingRole);
                if (pingRole) {
                    mention = `<@&${roleData.duyurPingRole}>`;
                }
            }



            const content = mention && mention.trim() !== '' ? mention : '📢 **Futbolcu Duyurusu**';
            await announcementChannel.send({
                content: content,
                embeds: [announcementEmbed]
            });

            await interaction.editReply({ content: `✅ Duyurunuz ${announcementChannel} kanalında yayınlandı!` });
        }
        
        // BRelease modal handling - using same form as regular release
        else if (customId.startsWith('brelease_modal_')) {
            try {
                console.log('BRelease modal submission received:', customId);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply({ ephemeral: true });
                    console.log('BRelease interaction deferred');
                }
                
                const [, , presidentId, playerId, releaseType] = customId.split('_');
                console.log('BRelease parsed IDs:', { presidentId, playerId, releaseType });
                const player = interaction.guild.members.cache.get(playerId);
                const president = interaction.guild.members.cache.get(presidentId);
                console.log('BRelease found users:', { 
                    player: player ? player.displayName : 'NOT FOUND', 
                    president: president ? president.displayName : 'NOT FOUND' 
                });

                if (!player || !president) {
                    console.log('BRelease: Users not found, stopping');
                    return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
                }

                // Use same field names as regular release command
                const releaseData = {
                    oldClub: interaction.fields.getTextInputValue('old_club') || '',
                    reason: interaction.fields.getTextInputValue('reason') || '',
                    compensation: interaction.fields.getTextInputValue('compensation') || '',
                    newTeam: interaction.fields.getTextInputValue('new_team') || ''
                };
                console.log('BRelease form data:', releaseData);

                const isNegotiationChannel = interaction.channel.name && 
                    (interaction.channel.name.includes("fesih") || interaction.channel.name.includes("release") || 
                     interaction.channel.name.includes("muzakere") || interaction.channel.name.includes("m-zakere"));
                console.log('BRelease is negotiation channel:', isNegotiationChannel);
                console.log('Channel name:', interaction.channel.name);

                if (isNegotiationChannel) {
                    console.log('Updating existing brelease channel...');
                    const embeds = require('./utils/embeds');
                    const releaseEmbed = embeds.createReleaseForm(player.user, president.user, releaseType, releaseData);
                    
                    // For brelease: maintain consistent parameter order - playerId should be president, presidentId should be player
                    const buttons = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId(`brelease_accept_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Kabul Et')
                                .setStyle('SUCCESS')
                                .setEmoji('✅'),
                            new MessageButton()
                                .setCustomId(`brelease_reject_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Reddet')
                                .setStyle('DANGER')
                                .setEmoji('❌'),
                            new MessageButton()
                                .setCustomId(`brelease_edit_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Düzenle')
                                .setStyle('SECONDARY')
                                .setEmoji('✏️')
                        );

                    const messages = await interaction.channel.messages.fetch({ limit: 10 });
                    const originalMessage = messages.find(msg => 
                        msg.embeds.length > 0 && 
                        msg.components.length > 0 &&
                        msg.components[0].components.some(btn => btn.customId && btn.customId.includes('brelease_'))
                    );

                    if (originalMessage) {
                        await originalMessage.edit({
                            embeds: [releaseEmbed],
                            components: [buttons]
                        });
                        await interaction.editReply({ content: `✅ Fesih formu güncellendi!` });
                    } else {
                        await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                    }
                } else {
                    console.log('Creating new negotiation channel for brelease...');
                    const channels = require('./utils/channels');
                    const channel = await channels.createNegotiationChannel(interaction.guild, player.user, president.user, 'fesih');
                    console.log('BRelease channel creation result:', channel ? channel.name : 'FAILED');
                    if (!channel) {
                        console.log('BRelease channel creation failed!');
                        return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                    }

                    const embeds = require('./utils/embeds');
                    const releaseEmbed = embeds.createReleaseForm(player.user, president.user, releaseType, releaseData);
                    
                    // For brelease: maintain consistent parameter order - playerId should be president, presidentId should be player
                    const buttons = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId(`brelease_accept_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Kabul Et')
                                .setStyle('SUCCESS')
                                .setEmoji('✅'),
                            new MessageButton()
                                .setCustomId(`brelease_reject_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Reddet')
                                .setStyle('DANGER')
                                .setEmoji('❌'),
                            new MessageButton()
                                .setCustomId(`brelease_edit_${playerId}_${presidentId}_${releaseType}`)
                                .setLabel('Düzenle')
                                .setStyle('SECONDARY')
                                .setEmoji('✏️')
                        );

                    await channel.send({
                        embeds: [releaseEmbed],
                        components: [buttons]
                    });

                    await interaction.editReply({ content: `✅ Fesih müzakeresi ${channel} kanalında başlatıldı!` });
                    console.log('BRelease channel created successfully:', channel.name);
                }
            } catch (error) {
                console.error('BRelease modal error:', error);
                await interaction.editReply({ content: `❌ Fesih işlemi sırasında hata oluştu: ${error.message}` });
            }
        }

        // Trade player salary edit modal handler
        else if (customId.startsWith('trade_edit_')) {
            console.log('Trade edit modal submission received:', customId);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }
            
            try {
                // Extract trade salary data from modal
                const tradePlayerData = {
                    wantedPlayerSalary: interaction.fields.getTextInputValue('wanted_player_salary') || 'Belirtilmemiş',
                    givenPlayerSalary: interaction.fields.getTextInputValue('given_player_salary') || 'Belirtilmemiş', 
                    wantedPlayerContract: interaction.fields.getTextInputValue('wanted_player_contract') || 'Belirtilmemiş',
                    givenPlayerContract: interaction.fields.getTextInputValue('given_player_contract') || 'Belirtilmemiş'
                };
                
                console.log('Trade salary data extracted:', tradePlayerData);
                
                // Update the embed in the current channel
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('trade_player_'))
                );

                if (originalMessage) {
                    const embed = originalMessage.embeds[0];
                    const { MessageEmbed } = require('discord.js');
                    const updatedEmbed = new MessageEmbed(embed);
                    
                    // Clear existing salary/contract fields and add updated ones
                    updatedEmbed.fields = updatedEmbed.fields.filter(f => 
                        !f.name.includes('Maaş') && !f.name.includes('Sözleşme')
                    );
                    
                    // Add updated fields
                    updatedEmbed.addFields(
                        { name: '💰 İstenen Oyuncunun Maaşı', value: tradePlayerData.wantedPlayerSalary, inline: true },
                        { name: '💸 Verilecek Oyuncunun Maaşı', value: tradePlayerData.givenPlayerSalary, inline: true },
                        { name: '📅 İstenen Oyuncunun Sözleşme/Ek Madde', value: tradePlayerData.wantedPlayerContract, inline: false },
                        { name: '📋 Verilecek Oyuncunun Sözleşme/Ek Madde', value: tradePlayerData.givenPlayerContract, inline: false }
                    );

                    await originalMessage.edit({
                        embeds: [updatedEmbed],
                        components: originalMessage.components
                    });
                    
                    await interaction.editReply({ content: 'Maaş bilgileri güncellendi!' });
                    console.log('Trade edit completed successfully');
                    return;
                } else {
                    await interaction.editReply({ content: 'Güncellenecek mesaj bulunamadı!' });
                    console.log('Original message not found for trade edit');
                    return;
                }
            } catch (error) {
                console.error('Trade edit error:', error);
                await interaction.editReply({ content: 'Güncelleme sırasında hata oluştu!' });
                return;
            }
        }
        
        // Trade form submission handler  
        else if (customId.startsWith('trade_form_')) {
            console.log('Trade form submission started:', customId);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply({ ephemeral: true });
                    console.log('✅ Trade form interaction deferred');
                }

            const params = customId.split('_');
            const targetPresidentId = params[2];
            const wantedPlayerId = params[3];  
            const givenPlayerId = params[4];
            const presidentId = params[5];

            console.log('Parsed IDs:', { targetPresidentId, wantedPlayerId, givenPlayerId, presidentId });

            const guild = interaction.guild;
                const targetPresident = await guild.members.fetch(targetPresidentId);
                const wantedPlayer = await guild.members.fetch(wantedPlayerId);
                const givenPlayer = await guild.members.fetch(givenPlayerId);
                const president = await guild.members.fetch(presidentId);

                console.log('Found users:', {
                    targetPresident: targetPresident.displayName,
                    wantedPlayer: wantedPlayer.displayName,
                    givenPlayer: givenPlayer.displayName,
                    president: president.displayName
                });

                if (!targetPresident || !wantedPlayer || !givenPlayer || !president) {
                    console.log('Missing users error');
                    return interaction.editReply({ content: 'Kullanıcılar bulunamadı!' });
                }

            const tradeData = {
                additionalAmount: interaction.fields.getTextInputValue('additional_amount') || '',
                bonus: interaction.fields.getTextInputValue('bonus') || '',
                contractDuration: interaction.fields.getTextInputValue('contract_duration') || ''
            };

            // Check if we're in a negotiation channel (editing existing form)
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("takas") || interaction.channel.name.includes("trade") || interaction.channel.name.includes("muzakere"));

            if (isNegotiationChannel) {
                // Update existing embed in the same channel
                const tradeEmbed = embeds.createTradeForm(president.user, targetPresident.user, wantedPlayer.user, tradeData);
                tradeEmbed.addFields(
                    { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true }
                );
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`trade_accept_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`trade_reject_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`trade_edit_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('trade_'))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [tradeEmbed],
                        components: [buttons]
                    });
                    await interaction.editReply({ content: `✅ Takas formu güncellendi!` });
                } else {
                    await interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` });
                }
            } else {
                // İlk başkan ile hedef başkan arasında müzakere kanalı oluştur
                console.log('Creating trade channel for:', president.user.username, 'and', targetPresident.user.username);
                const channel = await channels.createNegotiationChannel(interaction.guild, president.user, targetPresident.user, 'trade');
                console.log('Channel creation result:', channel ? channel.name : 'FAILED');
                if (!channel) {
                    return interaction.editReply({ content: 'Müzakere kanalı oluşturulamadı!' });
                }

                // Takas embed'i oluştur
                const tradeEmbed = embeds.createTradeForm(president.user, targetPresident.user, wantedPlayer.user, tradeData);
                tradeEmbed.addFields(
                    { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer.user}`, inline: true }
                );
                
                const buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`trade_accept_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Kabul Et')
                            .setStyle('SUCCESS')
                            .setEmoji('✅'),
                        new MessageButton()
                            .setCustomId(`trade_reject_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Reddet')
                            .setStyle('DANGER')
                            .setEmoji('❌'),
                        new MessageButton()
                            .setCustomId(`trade_edit_${targetPresidentId}_${wantedPlayerId}_${givenPlayerId}_${presidentId}`)
                            .setLabel('Düzenle')
                            .setStyle('SECONDARY')
                            .setEmoji('✏️')
                    );

                await channel.send({
                    embeds: [tradeEmbed],
                    components: [buttons]
                });

                await interaction.editReply({ content: `✅ Takas müzakeresi ${channel} kanalında başlatıldı!\n\n${targetPresident.user} ${president.user} - Lütfen ${channel} kanalına gidin ve müzakereyi tamamlayın.` });
            }
            } catch (error) {
                console.error('Trade form submission error:', error);
                return interaction.editReply({ content: 'Kullanıcılar getirilirken hata oluştu!' });
            }
        }
        
        // Continue with existing salary form handler
        else if (customId.startsWith('trade_salary_')) {
            try {
            const { targetPresidentId, wantedPlayerId, givenPlayerId, presidentId } = params;
            const guild = interaction.guild;
            
            const targetPresident = await guild.members.fetch(targetPresidentId);
            const wantedPlayer = await guild.members.fetch(wantedPlayerId);
            const givenPlayer = await guild.members.fetch(givenPlayerId);
            const president = await guild.members.fetch(presidentId);

            const tradePlayerData = {
                wantedPlayerSalary: interaction.fields.getTextInputValue('wanted_player_salary') || '',
                givenPlayerSalary: interaction.fields.getTextInputValue('given_player_salary') || '',
                wantedPlayerContract: interaction.fields.getTextInputValue('wanted_player_contract') || '',
                givenPlayerContract: interaction.fields.getTextInputValue('given_player_contract') || ''
            };

            // Güncel kanalda embed'i güncelle
            const isNegotiationChannel = interaction.channel && interaction.channel.name && 
                (interaction.channel.name.includes("takas") || interaction.channel.name.includes("trade") || interaction.channel.name.includes("muzakere"));

            if (isNegotiationChannel) {
                // Create new embed with updated salary and contract information for both players
                const updatedEmbed = new MessageEmbed()
                    .setColor(config.colors.warning)
                    .setTitle(`${config.emojis.trade} Takas - Oyuncu Onayı`)
                    .setDescription(`**Başkanlar anlaştı!** Şimdi her iki oyuncunun da onayı gerekiyor:\n\n🔄 **Takas Detayları:**\n📈 **İstenen:** ${wantedPlayer.user}\n📉 **Verilecek:** ${givenPlayer.user}`)
                    .addFields(
                        { name: '💰 İstenen Oyuncunun Maaşı', value: tradePlayerData.wantedPlayerSalary, inline: true },
                        { name: '💸 Verilecek Oyuncunun Maaşı', value: tradePlayerData.givenPlayerSalary, inline: true },
                        { name: '📅 İstenen Oyuncunun Sözleşme/Ek Madde', value: tradePlayerData.wantedPlayerContract, inline: false },
                        { name: '📋 Verilecek Oyuncunun Sözleşme/Ek Madde', value: tradePlayerData.givenPlayerContract, inline: false }
                    )
                    .setThumbnail(wantedPlayer.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: 'Transfer Sistemi - Oyuncu Onayı Bekleniyor' });

                const buttons = new MessageActionRow()
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

                // Find and update the original message
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.components.length > 0 &&
                    msg.components[0].components.some(btn => btn.customId && btn.customId.includes('trade_'))
                );

                if (originalMessage) {
                    await originalMessage.edit({
                        embeds: [updatedEmbed],
                        components: [buttons]
                    });
                    
                    // Clean up stored parameters
                    const channelId = interaction.channel.id;
                    delete global[`trade_params_${channelId}`];
                    
                    const reply = interaction.replied || interaction.deferred ? 
                        interaction.editReply({ content: `✅ Oyuncu maaşları güncellendi! Her iki oyuncunun da onayı bekleniyor.\n\n${targetPresident.user} ${president.user}` }) :
                        interaction.reply({ content: `✅ Oyuncu maaşları güncellendi! Her iki oyuncunun da onayı bekleniyor.\n\n${targetPresident.user} ${president.user}`, ephemeral: true });
                    await reply;
                } else {
                    const reply = interaction.replied || interaction.deferred ? 
                        interaction.editReply({ content: `❌ Güncellenecek mesaj bulunamadı!` }) :
                        interaction.reply({ content: `❌ Güncellenecek mesaj bulunamadı!`, ephemeral: true });
                    await reply;
                }
            } else {
                const reply = interaction.replied || interaction.deferred ? 
                    interaction.editReply({ content: `❌ Bu işlem sadece müzakere kanallarında yapılabilir!` }) :
                    interaction.reply({ content: `❌ Bu işlem sadece müzakere kanallarında yapılabilir!`, ephemeral: true });
                await reply;
            }
            } catch (error) {
                console.error('Trade player salary modal error:', error);
                try {
                    const reply = interaction.replied || interaction.deferred ? 
                        interaction.editReply({ content: 'Modal işlenirken hata oluştu!' }) :
                        interaction.reply({ content: 'Modal işlenirken hata oluştu!', ephemeral: true });
                    await reply;
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            }
        }
    } catch (error) {
        console.error('Modal submission error:', error);
        if (interaction.deferred) {
            await interaction.editReply({ 
                content: 'Modal işlenirken hata oluştu! Lütfen tekrar deneyin.' 
            });
        } else if (!interaction.replied) {
            await interaction.reply({ 
                content: 'Modal işlenirken hata oluştu! Lütfen tekrar deneyin.', 
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

// Bot'u başlat - retry mekanizması ile
console.log('🚀 Bot baslatiliyor...');
console.log(`📋 Token uzunlugu: ${process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 'YOK'}`);
console.log('ℹ️  Replit\'te Discord rate limit sorunu yasamak normaldir');
console.log('ℹ️  Bot otomatik olarak baglanti kurmaya devam edecektir');

// Aggressive retry with exponential backoff
let loginAttempts = 0;
const baseDelay = 60000; // 1 minute base
const maxDelay = 900000; // 15 minutes max

function attemptLogin() {
    loginAttempts++;
    
    console.log(`🔄 Discord'a baglaniliyor - deneme #${loginAttempts}`);
    console.log(`🚀 Discord gateway'e baglaniliyor...`);
    
    // Destroy existing client if exists
    if (client.readyTimestamp) {
        client.destroy();
    }
    
    client.login(process.env.DISCORD_TOKEN)
        .then(() => {
            console.log('✅ Baglanti basarili!');
            loginAttempts = 0;
        })
        .catch(error => {
            if (error.message.includes('429') || error.code === 429) {
                console.log(`❌ Rate limit hatası: ${error.message}`);
                console.log(`⏳ 5 saniye sonra yeniden deneme...`);
                setTimeout(() => attemptLogin(), 5000);
            } else if (error.message.includes('TOKEN_INVALID')) {
                console.error('🔑 KRITIK: Token gecersiz - yeni token gerekli');
                process.exit(1);
            } else if (loginAttempts < 15) {
                console.log(`❌ Baglanti hatasi: ${error.message.substring(0,50)}...`);
                console.log(`⏳ 10 saniye sonra yeniden deneme...`);
                setTimeout(() => attemptLogin(), 10000);
            } else {
                console.error('📋 Rate limit cozulemedi - manuel mudahale gerekli');
                console.log('💡 Cozum: Discord Developer Portal\'dan token\'i yeniden olusturun');
                process.exit(1);
            }
        });
}

// Hemen bağlanmayı dene - rate limit varsa otomatik bekleyecek
attemptLogin();
