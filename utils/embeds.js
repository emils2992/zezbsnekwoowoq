const { MessageEmbed } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player, offerData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`)
            .addFields(
                { name: `${config.emojis.handshake} Başkan`, value: `${president}`, inline: true },
                { name: '🏆 Yeni Kulüp', value: offerData?.newTeam || 'Belirtilmedi', inline: true },
                { name: '⚽ Futbolcu', value: `${player}`, inline: true },
                { name: '🏴 Eski Kulüp', value: offerData?.oldClub || 'Belirtilmedi', inline: true },
                { name: `${config.emojis.money} Önerilen Maaş`, value: offerData?.salary || '6.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme Süresi', value: offerData?.contractDuration || '2 yıl', inline: true },
                { name: '🎯 Bonuslar', value: offerData?.bonus || '250.000₺', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan sözleşme teklifi:`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `${fromPresident}`, inline: true },
                { name: '🏆 Yeni Kulüp', value: contractData?.newClub || 'Belirtilmemiş', inline: true },
                { name: '🏠 Eski Kulüp', value: contractData?.oldClub || 'Belirtilmemiş', inline: true },
                { name: '⚽ Futbolcu', value: `${player}`, inline: true },
                { name: `${config.emojis.money} Transfer Bedeli`, value: contractData?.transferFee || '2.500.000₺', inline: true },
                { name: '💰 Yıllık Maaş', value: contractData?.salary || '24.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme Süresi', value: contractData?.contractDuration || '3 yıl', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createTradeForm(fromPresident, toPresident, player, tradeData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.trade} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan takas teklifi:`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `${fromPresident}`, inline: true },
                { name: '⚽ Futbolcu', value: `${player}`, inline: true },
                { name: '🔄 İstenen Oyuncu', value: tradeData?.wantedPlayer || 'Belirtilmemiş', inline: true },
                { name: `${config.emojis.money} Ek Miktar`, value: tradeData?.additionalAmount || '0₺', inline: true },
                { name: '💰 Yıllık Maaş', value: tradeData?.salary || '18.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme Süresi', value: tradeData?.contractDuration || '2 yıl', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createHireForm(fromPresident, toPresident, player, hireData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.hire} Kiralık Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan kiralık teklifi:`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `${fromPresident}`, inline: true },
                { name: '⚽ Futbolcu', value: `${player}`, inline: true },
                { name: `${config.emojis.money} Kiralık Bedeli`, value: hireData?.loanFee || '500.000₺', inline: true },
                { name: '💰 Yıllık Maaş', value: hireData?.salary || '4.000.000₺/yıl', inline: true },
                { name: '📅 Kiralık Süresi', value: hireData?.loanDuration || '1 yıl', inline: true }
            );
        
        if (hireData?.optionToBuy) {
            embed.addFields({ name: '🔄 Satın Alma Opsiyonu', value: hireData.optionToBuy, inline: true });
        }

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createReleaseForm(president, player, releaseType, releaseData = null) {
        const color = releaseType === 'mutual' ? config.colors.warning : config.colors.error;
        const title = releaseType === 'mutual' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih';
        
        const embed = new MessageEmbed()
            .setColor(color)
            .setTitle(`${config.emojis.release} ${title}`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan fesih teklifi:`)
        
        const fields = [
            { name: `${config.emojis.handshake} Başkan`, value: `${president}`, inline: true },
            { name: '⚽ Futbolcu', value: `${player}`, inline: true },
            { name: '📋 Fesih Türü', value: title, inline: true }
        ];

        if (releaseData) {
            if (releaseData.oldClub) fields.push({ name: '🏆 Eski Kulüp', value: releaseData.oldClub, inline: true });
            if (releaseData.reason) fields.push({ name: '📝 Fesih Nedeni', value: releaseData.reason, inline: false });
            if (releaseData.compensation) fields.push({ name: `${config.emojis.money} Tazminat`, value: releaseData.compensation, inline: true });
            if (releaseData.newTeam) fields.push({ name: '🎯 Yeni Takım', value: releaseData.newTeam, inline: true });
        }
        
        embed.addFields(fields);

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
            .addFields({ name: '👥 Katılımcılar', value: participants.map(p => p.toString()).join('\n'), inline: false })
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