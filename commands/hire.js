const { MessageEmbed, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');

module.exports = {
    name: 'hire',
    description: 'Kiralık transfer işlemi başlat',
    usage: '.hire @hedefbaşkan @futbolcu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Hedef başkan kontrolü
            const targetPresident = message.mentions.users.first();
            if (!targetPresident) {
                return message.reply('❌ Lütfen bir hedef başkan etiketleyin!\nKullanım: `.hire @hedefbaşkan @futbolcu`');
            }

            // Futbolcu kontrolü
            const playerUser = message.mentions.users.at(1);
            if (!playerUser) {
                return message.reply('❌ Lütfen bir futbolcu etiketleyin!\nKullanım: `.hire @hedefbaşkan @futbolcu`');
            }

            const targetMember = message.guild.members.cache.get(targetPresident.id);
            const player = message.guild.members.cache.get(playerUser.id);

            if (!targetMember || !player) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Hedef başkan kontrolü
            if (!permissions.isPresident(targetMember)) {
                return message.reply('❌ Etiketlenen kişi bir başkan değil!');
            }

            // Futbolcu kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ Etiketlenen kişi bir futbolcu değil!');
            }

            // Kiralık sözleşme embed'i oluştur
            const hireEmbed = new MessageEmbed()
                .setColor(config.colors.warning)
                .setTitle(`${config.emojis.contract} Kiralık Sözleşme Teklifi`)
                .setDescription(`**${message.author.username}** tarafından **${targetPresident.username}**'e kiralık sözleşme teklifi yapılıyor.`)
                .addFields(
                    { name: '👑 Teklif Veren Başkan', value: `${message.author}`, inline: true },
                    { name: '👑 Hedef Başkan', value: `${targetPresident}`, inline: true },
                    { name: '⚽ Oyuncu', value: `${playerUser}`, inline: true },
                    { name: '📋 Sözleşme Türü', value: 'Kiralık Transfer', inline: true },
                    { name: '💡 Bilgi', value: 'Kiralık şartlarını belirlemek için formu doldurun.', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({
                content: `${config.emojis.contract} **Kiralık Sözleşme Teklifi**`,
                embeds: [hireEmbed],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`show_hire_modal_${targetPresident.id}_${message.author.id}_${playerUser.id}`)
                            .setLabel('Kiralık Formu Aç')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(config.emojis.edit)
                    )
                ]
            });

        } catch (error) {
            console.error('Hire komutu hatası:', error);
            message.reply('❌ Kiralık sözleşme işlemi başlatılırken bir hata oluştu!');
        }
    }
};