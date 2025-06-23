const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player, offerData = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`);

        embed.addFields(
            {
                name: `${config.emojis.handshake} Başkan`,
                value: `${president}`,
                inline: true
            },
            {
                name: `🏆 Yeni Kulüp`,
                value: offerData?.newTeam || 'Belirtilmedi',
                inline: true
            },
            {
                name: `⚽ Futbolcu`,
                value: `${player}`,
                inline: true
            },
            {
                name: `🏆 Eski Kulüp`,
                value: offerData?.oldClub || 'Belirtilmedi',
                inline: true
            },
            {
                name: `${config.emojis.money} Önerilen Maaş`,
                value: offerData?.salary || '6.000.000₺/yıl',
                inline: true
            },
            {
                name: '📅 Sözleşme Süresi',
                value: offerData?.contractDuration || '2 yıl',
                inline: true
            },
            {
                name: '🎯 Bonuslar',
                value: offerData?.bonus || '250.000₺',
                inline: true
            }
        );

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan sözleşme teklifi:`);

        embed.addFields(
            {
                name: `👑 Teklif Veren Başkan`,
                value: `${fromPresident}`,
                inline: true
            },
            {
                name: `👑 Hedef Başkan`,
                value: `${toPresident}`,
                inline: true
            },
            {
                name: `⚽ Oyuncu`,
                value: `${player}`,
                inline: true
            },
            {
                name: `🏆 Eski Kulüp`,
                value: contractData?.oldClub || 'Belirtilmedi',
                inline: true
            },
            {
                name: `🏟️ Yeni Kulüp`,
                value: contractData?.newClub || 'Belirtilmemiş',
                inline: true
            },
            {
                name: `${config.emojis.money} Transfer Bedeli`,
                value: contractData?.transferFee || '2.500.000₺',
                inline: true
            },
            {
                name: `💰 Yıllık Maaş`,
                value: contractData?.salary || '24.000.000₺/yıl',
                inline: true
            },
            {
                name: '📅 Sözleşme Süresi',
                value: contractData?.contractDuration || '3 yıl',
                inline: true
            }
        );

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createTradeForm(fromPresident, toPresident, player, tradeData = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.transfer} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan takas teklifi:`);

        embed.addFields(
            {
                name: `👑 Teklif Veren Başkan`,
                value: `${fromPresident}`,
                inline: true
            },
            {
                name: `👑 Hedef Başkan`,
                value: `${toPresident}`,
                inline: true
            },
            {
                name: `⚽ Takas Edilecek Oyuncu`,
                value: `${player}`,
                inline: true
            },
            {
                name: `🏆 Eski Kulüp`,
                value: tradeData?.oldClub || 'Belirtilmedi',
                inline: true
            }
        );

        if (tradeData?.additionalAmount > 0) {
            embed.addFields({
                name: `${config.emojis.money} Ek Miktar`,
                value: `${tradeData.additionalAmount.toLocaleString('tr-TR')}₺`,
                inline: true
            });
        }

        embed.addFields(
            {
                name: `💰 Maaş Teklifi`,
                value: tradeData?.salary || '850.000₺/ay',
                inline: true
            },
            {
                name: '📅 Sözleşme Süresi',
                value: tradeData?.contractDuration || '4 yıl',
                inline: true
            },
            {
                name: '⚽ İstenen Oyuncu',
                value: tradeData?.targetPlayer || 'Belirtilmedi',
                inline: true
            }
        );

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createReleaseForm(president, player, releaseType, releaseData = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.release} ${releaseType === 'mutual' ? 'Karşılıklı' : 'Tek Taraflı'} Fesih`)
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👑 Başkan', value: `${president}`, inline: true },
                { name: '⚽ Oyuncu', value: releaseData && releaseData.playerName ? `${player} (${releaseData.playerName})` : `${player}`, inline: true },
                { name: '📋 Fesih Türü', value: releaseType === 'mutual' ? 'Karşılıklı Anlaşma' : 'Tek Taraflı', inline: true }
            );

        if (releaseData) {
            if (releaseData.playerName) {
                embed.addFields({ name: '📝 Oyuncu İsmi', value: releaseData.playerName, inline: true });
            }
            if (releaseData.compensation) {
                embed.addFields({ name: '💰 Ek Tazminat', value: releaseData.compensation, inline: true });
            }
            if (releaseData.reason) {
                embed.addFields({ name: '📋 Fesih Sebebi', value: releaseData.reason, inline: false });
            }
            if (releaseData.newTeam) {
                embed.addFields({ name: '🏆 Yeni Takım', value: releaseData.newTeam, inline: true });
            }
            if (releaseData.bonus) {
                embed.addFields({ name: '💎 Ek Ödemeler', value: releaseData.bonus, inline: true });
            }
        } else {
            embed.addFields(
                { name: '💰 Ek Tazminat', value: 'Belirtilmedi', inline: true },
                { name: '📋 Fesih Sebebi', value: 'Sözleşme feshi', inline: true },
                { name: '🏆 Yeni Takım', value: 'Belirtilmedi', inline: true }
            );
        }

        return embed
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createNegotiationStarted(channel, participants) {
        return new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.handshake} Müzakere Başladı`)
            .setDescription(`Özel müzakere kanalı oluşturuldu!\n\n**Katılımcılar:**\n${participants.map(p => `• ${p}`).join('\n')}`)
            .addFields(
                {
                    name: '📋 Kurallar',
                    value: '• Saygılı bir dil kullanın\n• Tüm şartları açık belirtin\n• Anlaşma sağlandığında butonu kullanın',
                    inline: false
                },
                {
                    name: '⏰ Süre',
                    value: 'Bu kanal 24 saat sonra otomatik silinir',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createError(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.cross} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createSuccess(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }
}

module.exports = new EmbedCreator();
