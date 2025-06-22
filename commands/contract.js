const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const embeds = require('../utils/embeds');
const channels = require('../utils/channels');

module.exports = {
    name: 'contract',
    description: 'Başkanlar arası sözleşme müzakeresi',
    usage: '.contract @başkan @oyuncu',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü
            if (!permissions.isPresident(message.member)) {
                return message.reply('❌ Bu komutu sadece takım başkanları kullanabilir!');
            }

            // Argüman kontrolü
            const mentions = message.mentions.users;
            if (mentions.size < 2) {
                return message.reply('❌ Lütfen bir başkan ve bir oyuncu etiketleyin!\nKullanım: `.contract @başkan @oyuncu`');
            }

            const targetPresidentUser = mentions.first();
            const playerUser = mentions.last();

            if (targetPresidentUser.id === playerUser.id) {
                return message.reply('❌ Başkan ve oyuncu farklı kişiler olmalı!');
            }

            const targetPresident = message.guild.members.cache.get(targetPresidentUser.id);
            const player = message.guild.members.cache.get(playerUser.id);

            if (!targetPresident || !player) {
                return message.reply('❌ Etiketlenen kullanıcılar sunucuda bulunamadı!');
            }

            // Başkan rolü kontrolü
            if (!permissions.isPresident(targetPresident)) {
                return message.reply('❌ İlk etiketlenen kişi takım başkanı değil!');
            }

            // Oyuncu rolü kontrolü
            if (!permissions.isPlayer(player)) {
                return message.reply('❌ İkinci etiketlenen kişi futbolcu değil!');
            }

            // Oyuncunun müsait olup olmadığını kontrol et
            if (permissions.isFreeAgent(player)) {
                return message.reply('❌ Bu oyuncu serbest! Serbest oyuncular için `.offer` komutunu kullanın.');
            }

            // Sözleşme formu embed'i oluştur
            const contractEmbed = embeds.createContractForm(message.author, targetPresidentUser, playerUser);
            
            // Butonları oluştur
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`contract_accept_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                        .setLabel('Kabul Et')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.emojis.check),
                    new ButtonBuilder()
                        .setCustomId(`contract_reject_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                        .setLabel('Reddet')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.emojis.cross),
                    new ButtonBuilder()
                        .setCustomId(`contract_edit_${targetPresidentUser.id}_${message.author.id}_${playerUser.id}`)
                        .setLabel('Düzenle')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.emojis.edit)
                );

            // Özel müzakere kanalı oluştur
            const negotiationChannel = await channels.createNegotiationChannel(
                message.guild, 
                message.author, 
                targetPresidentUser,
                'contract',
                playerUser
            );

            if (!negotiationChannel) {
                return message.reply('❌ Müzakere kanalı oluşturulamadı!');
            }

            // Sözleşme teklifini özel kanala gönder
            await negotiationChannel.send({
                content: `${config.emojis.contract} **Yeni Sözleşme Teklifi**\n${targetPresidentUser}, ${message.author} sizden bir sözleşme teklifi var!\n\n**Oyuncu:** ${playerUser}`,
                embeds: [contractEmbed],
                components: [row]
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.contract} Sözleşme Teklifi Gönderildi`)
                .setDescription(`${playerUser} için ${targetPresidentUser} ile sözleşme müzakereniz başladı!\n\n**Müzakere Kanalı:** ${negotiationChannel}`)
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            await message.reply({ embeds: [successEmbed] });

            // Hedef başkana bildirim gönder
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle(`${config.emojis.contract} Yeni Sözleşme Teklifi!`)
                    .setDescription(`**${message.guild.name}** sunucusunda **${message.author.username}** sizden bir sözleşme teklifi geldi!\n\n**Oyuncu:** ${playerUser.username}\n**Müzakere Kanalı:** ${negotiationChannel}`)
                    .setTimestamp();

                await targetPresidentUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('DM gönderilemedi:', error.message);
            }

        } catch (error) {
            console.error('Contract komutu hatası:', error);
            message.reply('❌ Sözleşme teklifi gönderilirken bir hata oluştu!');
        }
    }
};
