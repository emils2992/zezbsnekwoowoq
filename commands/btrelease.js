const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'btrelease',
    description: 'Oyuncunun kendi sözleşmesini tek taraflı feshetmesi',
    usage: '.btrelease',

    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece tek taraflı fesih yetkisi olan futbolcular kullanabilir
            if (!permissions.isPlayer(message.member)) {
                return message.reply('❌ Bu komutu sadece futbolcular kullanabilir!');
            }
            
            if (!permissions.canUseUnilateralTermination(message.member)) {
                return message.reply('❌ Bu komutu kullanabilmek için tek taraflı fesih yetkisine sahip olmanız gerekiyor! Yetkililer `.rol` komutuyla bu yetkiyi ayarlayabilir.');
            }

            const player = message.author; // Komutu kullanan oyuncu
            const playerMember = message.member;

            // Modal form embed'i oluştur
            const formEmbed = new MessageEmbed()
                .setColor(config.colors.info)
                .setTitle(`${config.emojis.release} Tek Taraflı Fesih Formu`)
                .setDescription(`Sözleşme fesih detaylarınızı girin:`)
                .addFields(
                    { name: '⚽ Oyuncu', value: `${playerMember}`, inline: true },
                    { name: '📋 Fesih Türü', value: 'Tek Taraflı (Oyuncu)', inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleDateString('tr-TR'), inline: true },
                    { name: '📝 Gerekli Bilgiler', value: 'Formu doldurmak için aşağıdaki butona tıklayın', inline: false }
                )
                .setThumbnail(player.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Bu işlem geri alınamaz!' });

            // Form butonu oluştur
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`show_btrelease_modal_${player.id}_${player.id}`)
                        .setLabel('Tek Taraflı Fesih Formu Aç')
                        .setStyle('PRIMARY')
                        .setEmoji('📝')
                );

            await message.reply({
                embeds: [formEmbed],
                components: [row]
            });

        } catch (error) {
            console.error('BTRelease komutu hatası:', error);
            message.reply('❌ Tek taraflı fesih işlemi başlatılırken bir hata oluştu!');
        }
    }
};