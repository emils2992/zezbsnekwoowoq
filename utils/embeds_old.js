const { MessageEmbed } = require('discord.js');
const config = require('../config');

class EmbedCreator {
    createOfferForm(president, player, offerData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Transfer Teklifi`)
            .setDescription(`**${president.username}** tarafından **${player.username}** için yapılan teklif:`);

        embed
            .addField(`${config.emojis.handshake} Başkan`, `${president}`, true)
            .addField(`🏆 Yeni Kulüp`, offerData?.newTeam || 'Belirtilmedi', true)
            .addField(`⚽ Futbolcu`, `${player}`, true)
            .addField(`⚽ Oyuncu İsmi`, offerData?.playerName || 'Belirtilmedi', true)
            .addField(`${config.emojis.money} Önerilen Maaş`, offerData?.salary || '6.000.000₺/yıl', true)
            .addField('📅 Sözleşme Süresi & Ek Madde', offerData?.contractDuration || '2 yıl', true)
            .addField('🎯 Bonuslar', offerData?.bonus || '250.000₺', true);

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createContractForm(fromPresident, toPresident, player, contractData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.contract} Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan sözleşme teklifi:`);

        embed.addField(`👑 Teklif Veren Başkan`, `${fromPresident}`, true
            )
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
                name: '📅 Sözleşme Süresi & Ek Madde',
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
        const embed = new MessageEmbed()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.transfer} Takas Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan takas teklifi:`);

        embed.addField(`👑 Teklif Veren Başkan`, `${fromPresident}`, true
            )
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
            embed.addField(`${config.emojis.money} Ek Miktar`, `${tradeData.additionalAmount.toLocaleString('tr-TR')}₺`, true
            ));
        }

        embed.addField(`💰 Maaş Teklifi`, tradeData?.salary || '850.000₺/ay', true
            )
            {
                name: '📅 Sözleşme Süresi & Ek Madde',
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

    createHireForm(fromPresident, toPresident, player, hireData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.contract} Kiralık Sözleşme Teklifi`)
            .setDescription(`**${fromPresident.username}** tarafından **${toPresident.username}**'e yapılan kiralık sözleşme teklifi:`);

        embed.addField(`👑 Teklif Veren Başkan`, `${fromPresident}`, true
            )
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
                value: hireData?.oldClub || 'Belirtilmedi',
                inline: true
            },
            {
                name: `🏟️ Yeni Kulüp`,
                value: hireData?.newClub || 'Belirtilmemiş',
                inline: true
            },
            {
                name: `${config.emojis.money} Kiralık Bedeli`,
                value: hireData?.loanFee || '5.000.000₺',
                inline: true
            },
            {
                name: `💰 Kiralık Maaş`,
                value: hireData?.salary || '800.000₺/ay',
                inline: true
            },
            {
                name: '📅 Kiralık Süresi & Ek Madde',
                value: hireData?.loanDuration || '1 sezon',
                inline: true
            }
        );

        return embed
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createReleaseForm(president, player, releaseType, releaseData = null) {
        const embed = new MessageEmbed()
            .setColor(config.colors.warning)
            .setTitle(`${config.emojis.release} ${releaseType === 'mutual' ? 'Karşılıklı' : 'Tek Taraflı'} Fesih`)
            .setThumbnail(player.displayAvatarURL({ dynamic: true }))
            .addField('👑 Başkan', `${president}`, true )
                { name: '⚽ Oyuncu', value: releaseData && releaseData.playerName ? `${player} (${releaseData.playerName})` : `${player}`, inline: true },
                { name: '📋 Fesih Türü', value: releaseType === 'mutual' ? 'Karşılıklı Anlaşma' : 'Tek Taraflı', inline: true }
            );

        if (releaseData) {
            if (releaseData.playerName) {
                embed.addField('📝 Oyuncu İsmi', releaseData.playerName, true ));
            }
            if (releaseData.compensation) {
                embed.addField('💰 Ek Tazminat', releaseData.compensation, true ));
            }
            if (releaseData.reason) {
                embed.addField('📋 Fesih Sebebi', releaseData.reason, false ));
            }
            if (releaseData.newTeam) {
                embed.addField('🏆 Yeni Takım', releaseData.newTeam, true ));
            }
            if (releaseData.bonus) {
                embed.addField('💎 Ek Ödemeler', releaseData.bonus, true ));
            }
        } else {
            embed.addField('💰 Ek Tazminat', 'Belirtilmedi', true )
                { name: '📋 Fesih Sebebi', value: 'Sözleşme feshi', inline: true },
                { name: '🏆 Yeni Takım', value: 'Belirtilmedi', inline: true }
            );
        }

        return embed
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createNegotiationStarted(channel, participants) {
        return new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.handshake} Müzakere Başladı`)
            .setDescription(`Özel müzakere kanalı oluşturuldu!\n\n**Katılımcılar:**\n${participants.map(p => `• ${p}`).join('\n')}`)
            .addField('📋 Kurallar', '• Saygılı bir dil kullanın\n• Tüm şartları açık belirtin\n• Anlaşma sağlandığında butonu kullanın', false
                )
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
        return new MessageEmbed()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.cross} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }

    createSuccess(title, description) {
        return new MessageEmbed()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.check} ${title}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });
    }
}

module.exports = new EmbedCreator();
