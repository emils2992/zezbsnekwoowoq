const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const permissions = require('../utils/permissions');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'rol',
    description: 'Yetki rollerini ayarla',
    usage: '.rol [liste/ayarla/sıfırla]',
    
    async execute(client, message, args) {
        try {
            // Admin yetkisi kontrolü
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Bu komutu sadece yöneticiler kullanabilir!');
            }

            const subCommand = args[0]?.toLowerCase();

            switch (subCommand) {
                case 'liste':
                    await this.showRoleList(message);
                    break;
                case 'ayarla':
                    await this.setupRoles(message);
                    break;
                case 'sıfırla':
                    await this.resetRoles(message);
                    break;
                default:
                    await this.showHelp(message);
                    break;
            }

        } catch (error) {
            console.error('Rol komutu hatası:', error);
            message.reply('❌ Rol ayarlarında bir hata oluştu!');
        }
    },

    async showHelp(message) {
        const helpEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.warning} Rol Yönetimi Yardım`)
            .setDescription('Transfer sistemi için rol ayarlarını yönetin')
            .addFields(
                {
                    name: '📋 Komutlar',
                    value: '`.rol liste` - Mevcut rol ayarlarını görüntüle\n`.rol ayarla` - Rolleri ayarla\n`.rol sıfırla` - Rol ayarlarını sıfırla',
                    inline: false
                },
                {
                    name: '🎭 Rol Türleri',
                    value: '**Takım Başkanı:** Transfer yetkisi olan kişiler\n**Futbolcu:** Transfer edilebilir oyuncular\n**Serbest Futbolcu:** Sözleşmesiz oyuncular\n**Transfer Yetkilisi:** Duyuru yapabilir',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        await message.reply({ embeds: [helpEmbed] });
    },

    async showRoleList(message) {
        const roleData = permissions.getRoleData(message.guild.id);
        
        const listEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.football} Mevcut Rol Ayarları`)
            .setDescription(`**${message.guild.name}** sunucusu için rol ayarları:`)
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        // Rolleri listele
        const roleTypes = [
            { key: 'president', name: 'Takım Başkanı', emoji: '👑' },
            { key: 'player', name: 'Futbolcu', emoji: '⚽' },
            { key: 'freeAgent', name: 'Serbest Futbolcu', emoji: '🆓' },
            { key: 'transferAuthority', name: 'Transfer Yetkilisi', emoji: '📢' },
            { key: 'transferPingRole', name: 'Transfer Duyuru Ping', emoji: '🔔' },
            { key: 'freeAgentPingRole', name: 'Serbest Duyuru Ping', emoji: '🔔' },
            { key: 'announcementPingRole', name: 'Duyur Duyuru Ping', emoji: '🔔' }
        ];

        for (const roleType of roleTypes) {
            const roleId = roleData[roleType.key];
            const role = roleId ? message.guild.roles.cache.get(roleId) : null;
            
            listEmbed.addFields({
                name: `${roleType.emoji} ${roleType.name}`,
                value: role ? `${role}` : '❌ Ayarlanmamış',
                inline: true
            });
        }

        await message.reply({ embeds: [listEmbed] });
    },

    async setupRoles(message) {
        const setupEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.settings} Rol Ayarlama Sistemi`)
            .setDescription('Aşağıdaki butonları kullanarak rolleri ayarlayın:')
            .addFields(
                {
                    name: '👑 Başkan Rolü',
                    value: 'Transfer teklifleri yapabilir, sözleşme imzalayabilir',
                    inline: true
                },
                {
                    name: '⚽ Futbolcu Rolü', 
                    value: 'Transfer tekliflerini kabul/red edebilir',
                    inline: true
                },
                {
                    name: '🆓 Serbest Futbolcu Rolü',
                    value: 'Serbest oyuncular için özel işlemler',
                    inline: true
                },
                {
                    name: '🔧 Transfer Yetkili Rolü',
                    value: 'Tüm müzakereleri görebilir ve müdahale edebilir',
                    inline: true
                },
                {
                    name: '📢 Transfer Duyuru Kanalı',
                    value: 'Tamamlanan transferlerin duyurulacağı kanal',
                    inline: true
                },
                {
                    name: '🔔 Ping Rolleri',
                    value: 'Duyurularda etiketlenecek roller',
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Transfer Sistemi' });

        // İlk satır butonları
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_setup_president')
                    .setLabel('Başkan Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👑'),
                new ButtonBuilder()
                    .setCustomId('role_setup_player')
                    .setLabel('Futbolcu Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚽'),
                new ButtonBuilder()
                    .setCustomId('role_setup_freeAgent')
                    .setLabel('Serbest Futbolcu Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🆓')
            );

        // İkinci satır butonları
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_setup_transferAuthority')
                    .setLabel('Transfer Yetkili Rolü')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('role_setup_transferChannel')
                    .setLabel('Transfer Duyuru Kanalı')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📢')
            );

        // Üçüncü satır - ping rolleri
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_setup_transferPingRole')
                    .setLabel('Transfer Duyuru Ping')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔'),
                new ButtonBuilder()
                    .setCustomId('role_setup_freeAgentPingRole')
                    .setLabel('Serbest Duyuru Ping')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔'),
                new ButtonBuilder()
                    .setCustomId('role_setup_announcementPingRole')
                    .setLabel('Duyur Duyuru Ping')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔')
            );

        await message.reply({ 
            embeds: [setupEmbed], 
            components: [row1, row2, row3] 
        });
    },

    async resetRoles(message) {
        try {
            permissions.resetRoles(message.guild.id);
            
            const resetEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Roller Sıfırlandı`)
                .setDescription('Tüm rol ayarları başarıyla sıfırlandı!')
                .setTimestamp();

            await message.reply({ embeds: [resetEmbed] });

        } catch (error) {
            console.error('Rol sıfırlama hatası:', error);
            message.reply('❌ Roller sıfırlanırken bir hata oluştu!');
        }
    }
};
