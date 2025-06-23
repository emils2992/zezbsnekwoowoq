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
                value: `${player} ${offerData?.playerName ? `(${offerData.playerName})` : ''}`,
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
                value: `${player} ${contractData?.playerName ? `(${contractData.playerName})` : ''}`,
                inline: true
            },
            {
                name: `${config.emojis.money} Transfer Bedeli`,
                value: contractData?.transferFee || '2.500.000₺',
                inline: true
            },
            {
                name: `💰 Maaş Teklifi`,
                value: contractData?.salary || '750.000₺/ay',
                inline: true
            },
            {
                name: '📅 Sözleşme Süresi',
                value: contractData?.contractDuration || '3 yıl',
                inline: true
            },
            {
                name: '🎯 Bonuslar',
                value: contractData?.bonus || '500.000₺',
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
                value: `${player} ${tradeData?.playerName ? `(${tradeData.playerName})` : ''}`,
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

    createReleaseForm(president, player, releaseType) {
        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.release} Sözleşme Feshi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için fesih talebi:`)
            .addFields(
                {
                    name: `👑 Başkan`,
                    value: `${president}`,
                    inline: true
                },
                {
                    name: `⚽ Futbolcu`,
                    value: `${player}`,
                    inline: true
                },
                {
                    name: '📋 Fesih Türü',
                    value: releaseType === 'karşılıklı' ? 'Karşılıklı Fesih' : 'Tek Taraflı Fesih',
                    inline: true
                }
            )
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        if (releaseType === 'karşılıklı') {
            embed.setColor(config.colors.accent);
            embed.addFields({
                name: '📄 Fesih Şartları',
                value: '• Karşılıklı anlaşma ile fesih\n• Tazminat ödemesi yok\n• Serbest futbolcu statüsü',
                inline: false
            });
        } else {
            embed.setColor(config.colors.error);
            embed.addFields({
                name: '⚠️ Fesih Şartları',
                value: '• Tek taraflı fesih\n• Tazminat ödemesi gerekebilir\n• Serbest futbolcu statüsü',
                inline: false
            });
        }

        return embed;
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
