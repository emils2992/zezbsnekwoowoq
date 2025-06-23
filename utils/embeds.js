const { MessageEmbed } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player, offerData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`)
            .addField(`${config.emojis.handshake} Başkan`, `${president}`, true)
            .addField('🏆 Yeni Kulüp', offerData?.newTeam || 'Belirtilmedi', true)
            .addField('⚽ Futbolcu', `${player}`, true)
            .addField('⚽ Oyuncu İsmi', offerData?.playerName || 'Belirtilmedi', true)
            .addField(`${config.emojis.money} Önerilen Maaş`, offerData?.salary || '6.000.000₺/yıl', true)
            .addField('📅 Sözleşme Süresi', offerData?.contractDuration || '2 yıl', true)
            .addField('🎯 Bonuslar', offerData?.bonus || '250.000₺', true).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan sözleşme teklifi:`)
            .addField(`${config.emojis.handshake} Teklif Yapan`, `${fromPresident}`, true)
            .addField('🏆 Yeni Kulüp', contractData?.newClub || 'Belirtilmemiş', true)
            .addField('🏠 Eski Kulüp', contractData?.oldClub || 'Belirtilmemiş', true)
            .addField('⚽ Futbolcu', `${player}`, true)
            .addField(`${config.emojis.money} Transfer Bedeli`, contractData?.transferFee || '2.500.000₺', true)
            .addField('💰 Yıllık Maaş', contractData?.salary || '24.000.000₺/yıl', true)
            .addField('📅 Sözleşme Süresi', contractData?.contractDuration || '3 yıl', true).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createTradeForm(fromPresident, toPresident, player, tradeData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.trade} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan takas teklifi:`)
            .addField(`${config.emojis.handshake} Teklif Yapan`, `${fromPresident}`, true)
            .addField('⚽ Futbolcu', `${player}`, true)
            .addField('🔄 İstenen Oyuncu', tradeData?.requestedPlayer || 'Belirtilmemiş', true)
            .addField(`${config.emojis.money} Ek Miktar`, tradeData?.additionalAmount || '0₺', true)
            .addField('💰 Yıllık Maaş', tradeData?.salary || '18.000.000₺/yıl', true)
            .addField('📅 Sözleşme Süresi', tradeData?.contractDuration || '2 yıl', true).setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        return embed;
    }

    createHireForm(fromPresident, toPresident, player, hireData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.hire} Kiralık Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}** için yapılan kiralık teklifi:`)
            .addField(`${config.emojis.handshake} Teklif Yapan`, `${fromPresident}`, true)
            .addField('⚽ Futbolcu', `${player}`, true)
            .addField(`${config.emojis.money} Kiralık Bedeli`, hireData?.hireFee || '500.000₺', true)
            .addField('💰 Maaş Katkısı', hireData?.salaryContribution || '%50', true)
            .addField('📅 Kiralık Süresi', hireData?.hireDuration || '6 ay', true)
            .addField('🔄 Satın Alma Opsiyonu', hireData?.buyOption || 'Yok', true).setThumbnail(player.displayAvatarURL({ dynamic: true }))
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
            .addField(`${config.emojis.handshake} Başkan`, `${president}`, true)
            .addField('⚽ Futbolcu', `${player}`, true)
            .addField('📋 Fesih Türü', title, true);

        if (releaseType === 'mutual' && releaseData) {
            embed.addField(`${config.emojis.money} Tazminat`, releaseData.compensation || '0₺', true)
                .addField('📝 Fesih Nedeni', releaseData.reason || 'Belirtilmemiş', true)
                .addField('📅 Fesih Tarihi', releaseData.releaseDate || 'Hemen', true);
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