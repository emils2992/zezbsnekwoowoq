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
            { key: 'transferAuthority', name: 'Transfer Yetkilisi', emoji: '📢' }
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
            .setColor(config.colors.accent)
            .setTitle(`${config.emojis.edit} Rol Ayarlama`)
            .setDescription('Aşağıdaki menüden ayarlamak istediğiniz rol türünü seçin:')
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`role_setup_${message.author.id}`)
            .setPlaceholder('Rol türünü seçin...')
            .addOptions([
                {
                    label: 'Takım Başkanı',
                    description: 'Transfer yetkisi olan kişiler',
                    value: 'president',
                    emoji: '👑'
                },
                {
                    label: 'Futbolcu',
                    description: 'Transfer edilebilir oyuncular',
                    value: 'player',
                    emoji: '⚽'
                },
                {
                    label: 'Serbest Futbolcu',
                    description: 'Sözleşmesiz oyuncular',
                    value: 'freeAgent',
                    emoji: '🆓'
                },
                {
                    label: 'Transfer Yetkilisi',
                    description: 'Duyuru yapabilir',
                    value: 'transferAuthority',
                    emoji: '📢'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.reply({ 
            embeds: [setupEmbed], 
            components: [row] 
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
