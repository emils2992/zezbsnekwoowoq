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

            if (args.length < 3) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Kullanım: `.shop add ürün miktar`\nÖrnek: `.shop add Bugatti 50k`');
                return message.reply({ embeds: [embed] });
            }

            const itemName = args[1];
            const price = economy.parseAmount(args[2]);

            if (!price || price <= 0) {
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ Hata')
                    .setDescription('Lütfen geçerli bir fiyat girin!\nÖrnekler: `5k`, `5e3`, `5000`');
                return message.reply({ embeds: [embed] });
            }

            economy.addShopItem(message.guild.id, itemName, price);

            const embed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('🛍️ Ürün Eklendi')
                .setDescription(`**${itemName}** mağazaya eklendi!`)
                .addField('Ürün', itemName, true)
                .addField('Fiyat', `💰 ${economy.formatAmount(price)}`, true)
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Ekonomi loguna kaydet
            await logger.logTransaction(client, message.guild.id, {
                type: 'shop_add',
                admin: message.author.id,
                item: itemName,
                price: economy.formatAmount(price)
            });

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

        const embed = new MessageEmbed()
            .setColor('#0099FF')
            .setTitle('🛍️ Mağaza')
            .setDescription('Ürün satın almak için: `.shop buy ürün_adı`')
            .setTimestamp();

        itemEntries.forEach(([item, price]) => {
            embed.addField(item, `💰 ${economy.formatAmount(price)}`, true);
        });

        await message.reply({ embeds: [embed] });
    }
};