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
                { name: '🎯 Yeni Kulüp', value: offerData?.newTeam || 'Belirtilmemiş', inline: true },
                { name: `${config.emojis.money} Önerilen Maaş`, value: offerData?.salary || '6.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme+Ek Madde', value: offerData?.contractDuration || '2 yıl + bonuslar', inline: true },
                { name: '🎯 İmza Bonusu', value: offerData?.bonus || '3.000.000₺', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`${fromPresident} tarafından ${toPresident} için yapılan sözleşme teklifi:\n\n*Bu teklifin onaylanması için önce başkan onayı, sonra oyuncu onayı gereklidir.*`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `${fromPresident}`, inline: true },
                { name: '🏠 Eski Kulüp', value: contractData?.oldClub || 'Belirtilmemiş', inline: true },
                { name: '🏆 Yeni Kulüp', value: contractData?.newClub || 'Belirtilmemiş', inline: true },
                { name: '⚽ Futbolcu', value: `${player}`, inline: true },
                { name: `${config.emojis.money} Transfer Bedeli`, value: contractData?.transferFee || '2.500.000₺', inline: true },
                { name: '💰 Yıllık Maaş', value: contractData?.salary || '24.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme+Ekmadde', value: contractData?.contractDuration || '3 yıl', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createTradeForm(fromPresident, toPresident, wantedPlayer, tradeData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.trade} Takas Teklifi`)
            .setDescription(`${fromPresident} tarafından ${toPresident} için yapılan takas teklifi:`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `${fromPresident}`, inline: true },
                { name: '🎯 Hedef Başkan', value: `${toPresident}`, inline: true },
                { name: '📈 İstenen Oyuncu', value: `${wantedPlayer}`, inline: true },
                { name: `${config.emojis.money} Ek Miktar`, value: tradeData?.additionalAmount || '0₺', inline: true },
                { name: '📋 Bonus/Notlar', value: tradeData?.bonus || 'Belirtilmemiş', inline: true }
            ).setThumbnail(wantedPlayer.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createTradePlayerForm(fromPresident, toPresident, wantedPlayer, givenPlayer, tradeData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.trade} Oyuncu Onay Aşaması`)
            .setDescription(`Takas için oyuncu onayları bekleniyor. Her iki oyuncu da kabul etmelidir.`)
            .addFields(
                { name: `${config.emojis.handshake} Başkan 1`, value: `${fromPresident}`, inline: true },
                { name: '🎯 Başkan 2', value: `${toPresident}`, inline: true },
                { name: '📈 İstenen Oyuncu', value: `${wantedPlayer}`, inline: true },
                { name: '🔄 Verilecek Oyuncu', value: `${givenPlayer}`, inline: true },
                { name: `${config.emojis.money} Ek Miktar`, value: tradeData?.additionalAmount || '0₺', inline: true },
                { name: '💰 İstenen Oyuncu Maaşı', value: tradeData?.wantedPlayerSalary || '15.000.000₺/yıl', inline: true },
                { name: '💰 Verilecek Oyuncu Maaşı', value: tradeData?.givenPlayerSalary || '15.000.000₺/yıl', inline: true },
                { name: '📅 İstenen Oyuncu Sözleşme', value: tradeData?.wantedPlayerContract || '2 yıl + bonuslar', inline: true },
                { name: '📅 Verilecek Oyuncu Sözleşme', value: tradeData?.givenPlayerContract || '2 yıl + bonuslar', inline: true }
            ).setThumbnail(wantedPlayer.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi - Oyuncu Onayı' });

        return embed;
    }

    createHireForm(fromPresident, toPresident, player, hireData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.hire} Kiralık Teklifi`)
            .setDescription(`${fromPresident} tarafından ${toPresident} için yapılan kiralık teklifi:`)
            .addFields(
                { name: `${config.emojis.handshake} Teklif Yapan`, value: `<@${fromPresident.id}>`, inline: true },
                { name: '⚽ Futbolcu', value: `<@${player.id}>`, inline: true },
                { name: `${config.emojis.money} Kiralık Bedeli`, value: hireData?.loanFee || '2.000.000₺', inline: true },
                { name: '🏆 Eski Kulüp', value: hireData?.oldClub || 'Belirtilmemiş', inline: true },
                { name: '🎯 Yeni Kulüp', value: hireData?.newClub || 'Belirtilmemiş', inline: true },
                { name: '💰 Yıllık Maaş', value: hireData?.salary || '8.000.000₺/yıl', inline: true },
                { name: '📅 Sözleşme+Ek Madde', value: hireData?.contractDuration || '1 yıl + opsiyon', inline: true }
            );

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
            .setDescription(`${president} tarafından ${player} için yapılan fesih teklifi:`)
        
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

    createBduyurForm(president, player, bduyurData = null) {
        const embed = new MessageEmbed()
            .setColor('#FFD700') // Altın rengi transfer listesi için
            .setTitle(`${config.emojis.football} Transfer Listesi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** transfer listesine kondu:`)
            .addFields(
                { name: `${config.emojis.handshake} Başkan`, value: `${president}`, inline: true },
                { name: '🎯 Oyuncu', value: `${player}`, inline: true },
                { name: `${config.emojis.money} İstenen Ücret`, value: bduyurData?.amount || '10.000.000₺', inline: true },
                { name: '📝 Transfer Nedeni', value: bduyurData?.reason || 'Belirtilmemiş', inline: false },
                { name: '🔄 Kiralık mı', value: bduyurData?.loan || 'Hayır', inline: true },
                { name: '📋 Bonservis mi', value: bduyurData?.bonservis || 'Hayır', inline: true },
                { name: '💰 Oyuncunun İstediği Maaş', value: bduyurData?.salary || '5.000.000₺/yıl', inline: true }
            ).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Listesi Sistemi' });

        return embed;
    }
}

module.exports = new EmbedCreator();