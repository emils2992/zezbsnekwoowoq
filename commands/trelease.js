const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'trelease',
    description: 'Tek taraflı fesih işlemi başlat',
    async execute(client, message, args) {
        try {
            console.log('TRelease command started, checking permissions...');
            console.log('User ID:', message.author.id);
            console.log('Member roles:', message.member.roles.cache.map(r => r.name));
            
            // Yetki kontrolü - sadece başkanlar kullanabilir
            if (!permissions.isPresident(message.member)) {
                console.log('User is not a president');
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }
            
            console.log('President check passed');

            // Oyuncu belirtildi mi?
            const playerUser = message.mentions.users.first();
            if (!playerUser) {
                return message.reply('❌ Lütfen fesh edilecek oyuncuyu etiketleyin!\n**Kullanım:** `.trelease @oyuncu`');
            }

            const player = message.guild.members.cache.get(playerUser.id);
            if (!player) {
                return message.reply('❌ Oyuncu bu sunucuda bulunamadı!');
            }

            // Oyuncu kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ Etiketlenen kişi bir oyuncu değil!');
            }

            // Modal form embed'i oluştur
            const formEmbed = new MessageEmbed()
                .setColor(config.colors.info)
                .setTitle(`${config.emojis.release} Tek Taraflı Fesih Formu`)
                .setDescription(`${player} için tek taraflı fesih detaylarını girin:`)
                .addFields(
                    { name: '👑 Başkan', value: `${message.author}`, inline: true },
                    { name: '⚽ Oyuncu', value: `${player}`, inline: true },
                    { name: '📋 Fesih Türü', value: 'Tek Taraflı', inline: true },
                    { name: '📝 Gerekli Bilgiler', value: 'Formu doldurmak için aşağıdaki butona tıklayın', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Form butonu oluştur
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`show_trelease_modal_${player.id}_${message.author.id}`)
                        .setLabel('Tek Taraflı Fesih Formu Aç')
                        .setStyle('PRIMARY')
                        .setEmoji('📝')
                );

            await message.reply({
                embeds: [formEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('TRelease komutu hatası:', error);
            message.reply('❌ Tek taraflı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};