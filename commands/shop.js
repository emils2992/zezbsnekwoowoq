const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');
const PermissionManager = require('../utils/permissions');

module.exports = {
    name: 'shop',
    description: 'Mağaza işlemleri - ürün ekleme ve satın alma',
    usage: '.shop veya .shop add ürün miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();
        const permissions = new PermissionManager();

        // Shop add komutu
        if (args[0] === 'add') {
            // Yetki kontrolü
            if (!permissions.isTransferAuthority(message.member)) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Yetki Hatası')
                    .setDescription('Mağazaya ürün eklemek için transfer yetkisi gerekiyor!');
                return message.reply({ embeds: [embed] });
            }

            if (args.length < 4) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Kullanım: `.shop add emoji ürün_adı fiyat [kategori]`\nÖrnek: `.shop add 🚗 Bugatti 50k`\nEv için: `.shop add 🏡 Emilswdnin_Villasi 10M evler`');
                return message.reply({ embeds: [embed] });
            }

            const emoji = args[1];
            const itemName = args[2];
            const price = economy.parseAmount(args[3]);
            const category = args[4] || 'normal';

            if (!price || price <= 0) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Lütfen geçerli bir fiyat girin!\nÖrnekler: `5k`, `5e3`, `5000`');
                return message.reply({ embeds: [embed] });
            }

            economy.addShopItem(message.guild.id, itemName, price, emoji, category);

            const embed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('🛍️ Ürün Eklendi')
                .setDescription(`${emoji} **${itemName}** mağazaya eklendi!`)
                .addField('Ürün', `${emoji} ${itemName}`, true)
                .addField('Fiyat', `💰 ${economy.formatAmount(price)}`, true)
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Ekonomi loguna kaydet
            await logger.logTransaction(client, message.guild.id, {
                type: 'shop_add',
                admin: message.author.id,
                item: `${emoji} ${itemName}`,
                price: economy.formatAmount(price)
            });

            return;
        }

        // Shop remove komutu
        if (args[0] === 'remove') {
            // Yetki kontrolü
            if (!permissions.isTransferAuthority(message.member)) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Yetki Hatası')
                    .setDescription('Mağazadan ürün silmek için transfer yetkisi gerekiyor!');
                return message.reply({ embeds: [embed] });
            }

            if (args.length < 2) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Kullanım: `.shop remove ürün_adı`\nÖrnek: `.shop remove Bugatti`');
                return message.reply({ embeds: [embed] });
            }

            const itemName = args.slice(1).join(' ');
            const result = economy.removeShopItem(message.guild.id, itemName);

            if (result.success) {
                const embed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('🗑️ Ürün Silindi')
                    .setDescription(`**${itemName}** mağazadan kaldırıldı!`)
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

                // Ekonomi loguna kaydet
                await logger.logTransaction(client, message.guild.id, {
                    type: 'shop_remove',
                    admin: message.author.id,
                    item: itemName
                });
            } else {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription(result.error);
                return message.reply({ embeds: [embed] });
            }

            return;
        }

        // Normal shop listesi
        const shopItems = economy.getShopItems(message.guild.id);
        const itemEntries = Object.entries(shopItems);

        if (itemEntries.length === 0) {
            const embed = new MessageEmbed()
                .setColor('#FF6600')
                .setTitle('🛍️ Mağaza')
                .setDescription('Mağaza henüz boş! Yetkililer `.shop add` komutu ile ürün ekleyebilir.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        // Kategorilere ayır
        const categories = {
            'normal': [],
            'evler': []
        };

        itemEntries.forEach(([name, data]) => {
            const category = data.category || 'normal';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push([name, data]);
        });

        const embed = new MessageEmbed()
            .setColor('#0099FF')
            .setTitle('🛍️ Mağaza')
            .setDescription('Ürün satın almak için: `.buy ürün_adı`')
            .setTimestamp();

        // Normal kategorideki ürünleri göster
        if (categories.normal.length > 0) {
            categories.normal.forEach(([item, data]) => {
                const price = typeof data === 'object' ? data.price : data;
                const emoji = typeof data === 'object' ? data.emoji : '📦';
                const displayName = `${emoji} ${item}`;
                embed.addField(displayName, `💰 ${economy.formatAmount(price)}`, true);
            });
        }

        // Evler kategorisini en alta ekle
        if (categories.evler.length > 0) {
            embed.addField('\u200B', '\u200B', false); // Boş satır
            embed.addField('🏠 **Evler**', 'Sadece bir ev sahibi olabilirsiniz!', false);
            
            categories.evler.forEach(([item, data]) => {
                const price = typeof data === 'object' ? data.price : data;
                const emoji = typeof data === 'object' ? data.emoji : '🏡';
                const displayName = `${emoji} ${item}`;
                
                // Villa fotoğrafı ekle
                if (item.toLowerCase().includes('villa')) {
                    embed.setImage('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80');
                }
                
                embed.addField(displayName, `💰 ${economy.formatAmount(price)}`, true);
            });
        }

        await message.reply({ embeds: [embed] });
    }
};