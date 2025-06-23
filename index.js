const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const CommandHandler = require('./handlers/commandHandler');
const ButtonHandler = require('./handlers/buttonHandler');

// Handler instances oluştur
const commandHandler = new CommandHandler();
const buttonHandler = new ButtonHandler();

// Bot client oluştur
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
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
        } else if (interaction.isSelectMenu()) {
            await handleSelectMenu(client, interaction);

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

// Note: Modal submissions removed - Discord.js v13 uses channel-based negotiations instead
// All transfer negotiations now happen in dedicated channels with button interactions

        // Offer form modali
        if (customId.startsWith('offer_form_')) {
            const [, , playerId, presidentId] = customId.split('_');
            const player = interaction.guild.members.cache.get(playerId);
            const president = interaction.guild.members.cache.get(presidentId);

            if (!player || !president) {
                return interaction.editReply({ content: '❌ Kullanıcılar bulunamadı!' });
            }

            // Form verilerini al
