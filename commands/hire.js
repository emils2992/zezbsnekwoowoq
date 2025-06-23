const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

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

            // Müzakere kanalı oluştur
            const channel = await channels.createNegotiationChannel(message.guild, message.author, targetMember.user, 'hire', player.user);
            if (!channel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Kiralık embed'i oluştur
            const hireEmbed = embeds.createHireForm(message.author, targetMember.user, player.user);
            
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`hire_accept_${player.id}_${message.author.id}`)
                        .setLabel('Kabul Et')
                        .setStyle('SUCCESS')
                        .setEmoji('✅'),
                    new MessageButton()
                        .setCustomId(`hire_reject_${player.id}_${message.author.id}`)
                        .setLabel('Reddet')
                        .setStyle('DANGER')
                        .setEmoji('❌'),
                    new MessageButton()
                        .setCustomId(`hire_edit_${player.id}_${message.author.id}`)
                        .setLabel('Düzenle')
                        .setStyle('SECONDARY')
                        .setEmoji('✏️')
                );

            await channel.send({
                embeds: [hireEmbed],
                components: [buttons]
            });

            await message.reply(`✅ Kiralık müzakeresi ${channel} kanalında başlatıldı!`);

        } catch (error) {
            console.error('Hire komutu hatası:', error);
            message.reply('❌ Kiralık sözleşme işlemi başlatılırken bir hata oluştu!');
        }
    }
};