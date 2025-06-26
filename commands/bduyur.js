const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'bduyur',
    description: 'Başkanların futbolcu transfer listesi duyurusu',
    
    async execute(client, message, args) {
        try {
            const PermissionManager = require('../utils/permissions');
            const permissions = new PermissionManager();
            const CooldownManager = require('../utils/cooldowns');
            const cooldowns = new CooldownManager();
            
            // Sadece başkanlar kullanabilir
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece başkanlar kullanabilir!');
            }

            // 24 saat cooldown kontrolü
            const cooldownCheck = cooldowns.canUseCommand(message.guild.id, message.author.id, 'bduyur');
            if (!cooldownCheck.canUse) {
                const remainingTime = cooldowns.formatRemainingTime(cooldownCheck.remainingTime);
                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('⏰ Komut Bekleme Süresi')
                    .setDescription(`Bu komutu tekrar kullanabilmek için **${remainingTime}** beklemelisin!`)
                    .addField('Son Kullanım', 'Bu komutu 24 saatte bir kullanabilirsin', false)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            if (args.length < 1) {
                return message.reply('❌ Kullanım: `.bduyur @futbolcu`');
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!');
            }

            const targetMember = message.guild.members.cache.get(targetUser.id);
            if (!targetMember) {
                return message.reply('❌ Bu kullanıcı sunucuda bulunamadı!');
            }

            // Futbolcu rolü kontrolü - sadece futbolcular transfer listesine konabilir
            if (!permissions.isPlayer(targetMember)) {
                return message.reply('❌ Bu kişi futbolcu değil! Sadece futbolcular transfer listesine konabilir.');
            }

            // Serbest futbolcu kontrolü - serbest futbolcular transfer listesine konulamaz
            if (permissions.isFreeAgent(targetMember)) {
                return message.reply('❌ Serbest futbolcular transfer listesine konulamaz! Onlar zaten serbest.');
            }

            // Kendi kendini etiketleme kontrolü
            if (targetUser.id === message.author.id) {
                return message.reply('❌ Kendi kendinizi transfer listesine koyamazsınız!');
            }

            // Set cooldown for this command
            cooldowns.setCooldown(message.guild.id, message.author.id, 'bduyur');

            // Modal formu butonunu göster
            await message.reply({
                content: `${config.emojis.football} **Transfer Listesi Duyuru Formu**\n\n${targetMember.displayName} için transfer listesi duyurusunu oluşturmak üzere aşağıdaki butona tıklayın.`,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`show_bduyur_modal_${targetUser.id}_${message.author.id}`)
                            .setLabel('Transfer Listesi Formu Aç')
                            .setStyle('PRIMARY')
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('BDuyur komutu hatası:', error);
            message.reply('❌ Transfer listesi duyurusu oluşturulurken bir hata oluştu!');
        }
    }
};