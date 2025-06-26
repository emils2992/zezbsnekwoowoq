const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');
const config = require('../config');

module.exports = {
    name: 'illegal',
    description: 'Yasadışı hizmetler - eve sahipsen özel aktiviteler',
    usage: '.illegal',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();
        
        try {
            const userData = economy.getUserData(message.guild.id, message.author.id);
            
            // Kullanıcının evi var mı kontrol et
            const hasHouse = userData.inventory && Object.keys(userData.inventory).some(item => {
                const shopData = economy.getShopItems(message.guild.id);
                const shopItem = shopData[item];
                return shopItem && shopItem.category === 'evler';
            });

            const illegalServices = {
                'escort': {
                    name: '💃 Escort Hizmeti',
                    price: 50000,
                    emoji: '💃',
                    description: 'Özel escort hizmeti',
                    needsHouse: false,
                    response: 'Escort geldi! "Hadi yapalım bu işi!" 😈'
                },
                'hitman': {
                    name: '🔫 Tetikçi Kiralama',
                    price: 200000,
                    emoji: '🔫',
                    description: 'Profesyonel tetikçi hizmeti',
                    needsHouse: true,
                    response: 'Tetikçi evinde seni bekliyor... İş konuşmaya hazır! 🎯'
                },
                'drugs': {
                    name: '💊 Uyuşturucu Satışı',
                    price: 75000,
                    emoji: '💊',
                    description: 'Yüksek kalite uyuşturucu',
                    needsHouse: true,
                    response: 'Uyuşturucu evinde saklandı! Artık satabilirsin! 💰'
                },
                'weapons': {
                    name: '🔪 Silah Kaçakçılığı',
                    price: 150000,
                    emoji: '🔪',
                    description: 'Kaçak silah tedariki',
                    needsHouse: true,
                    response: 'Silahlar evinin gizli bölmesinde! Kimse bulamayacak! 🤫'
                },
                'money_laundry': {
                    name: '💸 Para Aklama',
                    price: 100000,
                    emoji: '💸',
                    description: 'Kirli parayı temizle',
                    needsHouse: true,
                    response: 'Para aklama sistemi evinde kuruldu! Artık güvendesin! 🏦',
                    bonus: 25000
                },
                'casino': {
                    name: '🎰 Yeraltı Kumarhanesi',
                    price: 300000,
                    emoji: '🎰',
                    description: 'Evinde gizli kumarhane',
                    needsHouse: true,
                    response: 'Evinde yeraltı kumarhanesi açıldı! Para yağmuru başlasın! 🤑',
                    bonus: 50000
                }
            };

            // Hizmet seçimi
            if (args.length === 0) {
                const embed = new MessageEmbed()
                    .setColor('#8B0000')
                    .setTitle('🕴️ Yasadışı Hizmetler')
                    .setDescription(`**${message.author.username}** - Hangi hizmeti istiyorsun?\n\n${hasHouse ? '🏠 **Evin var! Tüm hizmetler kullanılabilir**' : '⚠️ **Evi olmayanlar sadece escort çağırabilir**'}`)
                    .setThumbnail('https://images.unsplash.com/photo-1574481570746-b88b43ea7fcd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80')
                    .setTimestamp();

                Object.entries(illegalServices).forEach(([key, service]) => {
                    const available = !service.needsHouse || hasHouse;
                    const status = available ? '✅' : '🔒';
                    const priceText = available ? `💰 ${economy.formatAmount(service.price)}` : 'Ev gerekli!';
                    
                    embed.addField(
                        `${status} ${service.name}`,
                        `${service.description}\n${priceText}`,
                        true
                    );
                });

                embed.setFooter({ text: 'Kullanım: .illegal [hizmet_adı]' });

                return message.reply({ embeds: [embed] });
            }

            // Belirli bir hizmet seçildi
            const serviceKey = args[0].toLowerCase();
            const service = illegalServices[serviceKey];

            if (!service) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Geçersiz hizmet! Kullanılabilir hizmetler:\n' + 
                        Object.keys(illegalServices).map(key => `\`${key}\``).join(', '));
                return message.reply({ embeds: [embed] });
            }

            // Ev kontrolü
            if (service.needsHouse && !hasHouse) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('🏠 Ev Gerekli!')
                    .setDescription(`**${service.name}** hizmeti için bir evin olması gerekiyor!\n\nMağazaya bakmak için: \`.shop\``);
                return message.reply({ embeds: [embed] });
            }

            // Para kontrolü
            if (userData.cash < service.price) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('💰 Yetersiz Bakiye')
                    .setDescription(`**${service.name}** için ${economy.formatAmount(service.price)} gerekiyor!\nSenin bakiyen: ${economy.formatAmount(userData.cash)}`);
                return message.reply({ embeds: [embed] });
            }

            // Onay butonu
            const confirmRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`illegal_confirm_${serviceKey}_${message.author.id}`)
                        .setLabel(`${service.name} - ${economy.formatAmount(service.price)}`)
                        .setStyle('DANGER')
                        .setEmoji(service.emoji),
                    new MessageButton()
                        .setCustomId(`illegal_cancel_${message.author.id}`)
                        .setLabel('İptal')
                        .setStyle('SECONDARY')
                        .setEmoji('❌')
                );

            const embed = new MessageEmbed()
                .setColor('#8B0000')
                .setTitle('⚠️ Yasadışı Hizmet Onayı')
                .setDescription(`**${service.name}** hizmetini satın almak istediğinden emin misin?\n\n${service.description}`)
                .addField('💰 Fiyat', economy.formatAmount(service.price), true)
                .addField('🏠 Ev Gerekli', service.needsHouse ? 'Evet' : 'Hayır', true)
                .addField('💳 Bakiyen', economy.formatAmount(userData.cash), true)
                .setFooter({ text: 'Bu işlem geri alınamaz!' })
                .setTimestamp();

            if (service.needsHouse) {
                embed.setImage('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80');
            }

            await message.reply({ embeds: [embed], components: [confirmRow] });

        } catch (error) {
            console.error('Illegal komut hatası:', error);
            message.reply('❌ Yasadışı hizmetler yüklenirken bir hata oluştu.');
        }
    }
};