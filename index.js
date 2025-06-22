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

// Etkileşim dinleyicisi (butonlar ve select menüler)
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            await buttonHandler.handleButton(client, interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(client, interaction);
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
            'transferAuthority': 'Transfer Yetkilisi'
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

// Hata yönetimi
client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Bot'u başlat
client.login(process.env.DISCORD_TOKEN);
