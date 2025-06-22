const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player) {
        return new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`)
            .addFields(
                {
                    name: `${config.emojis.handshake} Başkan`,
                    value: `${president}`,
                    inline: true
                },
                {
                    name: `⚽ Futbolcu`,
                    value: `${player}`,
                    inline: true
                },
                {
                    name: `${config.emojis.money} Önerilen Maaş`,
                    value: '500.000₺/ay',
                    inline: true
                },
                {
                    name: `💎 İmza Parası`,
                    value: '1.000.000₺',
                    inline: true
                },
                {
                    name: '📅 Sözleşme Süresi',
                    value: '2 yıl',
                    inline: true
                },
                {
                    name: '🎯 Bonuslar',
                    value: 'Gol bonusu: 10.000₺\nAsist bonusu: 5.000₺',
                    inline: false
                }
            )
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createContractForm(fromPresident, toPresident, player) {
        return new EmbedBuilder()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan sözleşme teklifi:`)
            .addFields(
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
                    name: `${config.emojis.money} Transfer Bedeli`,
                    value: '2.500.000₺',
                    inline: true
                },
                {
                    name: `💰 Maaş Teklifi`,
                    value: '750.000₺/ay',
                    inline: true
                },
                {
                    name: '📅 Sözleşme Süresi',
                    value: '3 yıl',
                    inline: true
                },
                {
                    name: '📋 Ek Şartlar',
                    value: '• Kiralama opsiyonu yok\n• Satış opsiyon bedeli: %20\n• Bonuslar ayrıca görüşülecek',
                    inline: false
                }
            )
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createTradeForm(fromPresident, toPresident, player, additionalAmount = 0) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.transfer} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan takas teklifi:`)
            .addFields(
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
                }
            )
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        if (additionalAmount > 0) {
            embed.addFields({
                name: `${config.emojis.money} Ek Miktar`,
                value: `${additionalAmount.toLocaleString('tr-TR')}₺`,
                inline: true
            });
        }

        embed.addFields({
            name: '📋 Takas Şartları',
            value: '• Karşılıklı oyuncu değişimi\n• Maaş farkları ayrıca görüşülecek\n• Bonuslar korunacak',
            inline: false
        });

        return embed;
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
