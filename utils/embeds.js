const { MessageEmbed } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player, offerData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`)
            .addFields({ name: '${config.emojis.handshake} Başkan', value: `${president}`, inline: true }, { name: '🏆 Yeni Kulüp', value: offerData?.newTeam || 'Belirtilmedi', inline: true }, { name: '⚽ Futbolcu', value: `${player}`, inline: true }, { name: '⚽ Oyuncu İsmi', value: offerData?.playerName || 'Belirtilmedi', inline: true }, { name: '${config.emojis.money} Önerilen Maaş', value: offerData?.salary || '6.000.000₺/yıl', inline: true }, { name: '📅 Sözleşme Süresi', value: offerData?.contractDuration || '2 yıl', inline: true }, { name: '🎯 Bonuslar', value: offerData?.bonus || '250.000₺', inline: true }).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan sözleşme teklifi:`)
            .addFields({ name: '${config.emojis.handshake} Teklif Yapan', value: `${fromPresident}`, inline: true }, { name: '🏆 Yeni Kulüp', value: contractData?.newClub || 'Belirtilmemiş', inline: true }, { name: '🏠 Eski Kulüp', value: contractData?.oldClub || 'Belirtilmemiş', inline: true }, { name: '⚽ Futbolcu', value: `${player}`, inline: true }, { name: '${config.emojis.money} Transfer Bedeli', value: contractData?.transferFee || '2.500.000₺', inline: true }, { name: '💰 Yıllık Maaş', value: contractData?.salary || '24.000.000₺/yıl', inline: true }, { name: '📅 Sözleşme Süresi', value: contractData?.contractDuration || '3 yıl', inline: true }).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createTradeForm(fromPresident, toPresident, player, tradeData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.trade} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan takas teklifi:`)
            .addFields({ name: '${config.emojis.handshake} Teklif Yapan', value: `${fromPresident}`, inline: true }, { name: '⚽ Futbolcu', value: `${player}`, inline: true }, { name: '🔄 İstenen Oyuncu', value: tradeData?.requestedPlayer || 'Belirtilmemiş', inline: true }, { name: '${config.emojis.money} Ek Miktar', value: tradeData?.additionalAmount || '0₺', inline: true }, { name: '💰 Yıllık Maaş', value: tradeData?.salary || '18.000.000₺/yıl', inline: true }, { name: '📅 Sözleşme Süresi', value: tradeData?.contractDuration || '2 yıl', inline: true }).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createHireForm(fromPresident, toPresident, player, hireData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.hire} Kiralık Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan kiralık teklifi:`)
            .addFields({ name: '${config.emojis.handshake} Teklif Yapan', value: `${fromPresident}`, inline: true }, { name: '⚽ Futbolcu', value: `${player}`, inline: true }, { name: '${config.emojis.money} Kiralık Bedeli', value: hireData?.hireFee || '500.000₺', inline: true }, { name: '💰 Maaş Katkısı', value: hireData?.salaryContribution || '%50', inline: true }, { name: '📅 Kiralık Süresi', value: hireData?.hireDuration || '6 ay', inline: true }, { name: '🔄 Satın Alma Opsiyonu', value: hireData?.buyOption || 'Yok', inline: true }).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createReleaseForm(president, player, releaseType, releaseData = null) {
        const color = releaseType === 'mutual' ? config.colors.warning : config.colors.error;
        const title = releaseType === 'mutual' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih';
        
        const embed = new MessageEmbed()
            .setColor(color)
            .setTitle(`${config.emojis.release} ${title}`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan fesih teklifi:`)
            .addFields({ name: '${config.emojis.handshake} Başkan', value: `${president}`, inline: true }, { name: '⚽ Futbolcu', value: `${player}`, inline: true }, { name: '📋 Fesih Türü', value: title, inline: true });

        if (releaseType === 'mutual' && releaseData) {
            embed.addFields({ name: '${config.emojis.money} Tazminat', value: releaseData.compensation || '0₺', inline: true }, { name: '📝 Fesih Nedeni', value: releaseData.reason || 'Belirtilmemiş', inline: true }, { name: '📅 Fesih Tarihi', value: releaseData.releaseDate || 'Hemen', inline: true });
        }

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createNegotiationStarted(channel, participants) {
        return new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.handshake} Müzakere Başladı`)
            .setDescription(`Müzakere kanalı oluşturuldu: ${channel}`)
            .addField('👥 Katılımcılar', participants.map(p => p.toString()).join('\n'), false)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createError(title, description) {
        return new MessageEmbed()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.cross} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    createSuccess(title, description) {
        return new MessageEmbed()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} ${title}`)
            .setDescription(description)
            .setTimestamp();
    }
}

module.exports = new EmbedCreator();