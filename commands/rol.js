const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
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
            // Yetki kontrolü
            if (!permissions.isTransferAuthority(message.member) && !message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri veya yöneticiler kullanabilir!');
            }

            if (args.length === 0) {
                return this.showRoleMenu(message);
            }

            const subCommand = args[0].toLowerCase();

            switch (subCommand) {
                case 'ayarla':
                    if (args.length === 1) {
                        return this.showRoleMenu(message);
                    }
                    return this.setupRoles(message, args.slice(1));
                case 'liste':
                    return this.showRoleList(message);
                case 'sıfırla':
                case 'sifirla':
                    return this.resetRoles(message);
                case 'menu':
                    return this.showRoleMenu(message);
                default:
                    return this.showRoleMenu(message);
            }
        } catch (error) {
            console.error('Rol komutu hatası:', error);
            message.reply('❌ Rol ayarlarken bir hata oluştu!');
        }
    },

    async showRoleMenu(message) {
        const embed = new MessageEmbed()
            .setColor(config.colors.info)
            .setTitle('🎭 Rol Yönetim Menüsü')
            .setDescription('Hangi rolü ayarlamak istiyorsunuz? Aşağıdaki butonlardan birini seçin:')
            .addFields(
                { name: '📋 Mevcut Roller', value: 'Rolleri görmek için "Liste" butonuna tıklayın', inline: false },
                { name: '🔧 Kullanım', value: 'Bir rol türü seçtikten sonra rol etiketleyerek ayarlayın', inline: false }
            )
            .setFooter({ text: 'Rol Sistemi' })
            .setTimestamp();

        const row1 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('role_select_baskan')
                    .setLabel('Başkan Rolü')
                    .setStyle('PRIMARY')
                    .setEmoji('👑'),
                new MessageButton()
                    .setCustomId('role_select_futbolcu')
                    .setLabel('Futbolcu Rolü')
                    .setStyle('PRIMARY')
                    .setEmoji('⚽'),
                new MessageButton()
                    .setCustomId('role_select_serbest')
                    .setLabel('Serbest Futbolcu')
                    .setStyle('PRIMARY')
                    .setEmoji('🆓')
            );

        const row2 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('role_select_yetkili')
                    .setLabel('Transfer Yetkili')
                    .setStyle('SUCCESS')
                    .setEmoji('🔧'),
                new MessageButton()
                    .setCustomId('role_select_ping_tf')
                    .setLabel('Transfer Ping')
                    .setStyle('SECONDARY')
                    .setEmoji('📢'),
                new MessageButton()
                    .setCustomId('role_select_ping_serbest')
                    .setLabel('Serbest Ping')
                    .setStyle('SECONDARY')
                    .setEmoji('🔔')
            );

        const row3 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('role_select_ping_duyur')
                    .setLabel('Duyuru Ping')
                    .setStyle('SECONDARY')
                    .setEmoji('📣'),
                new MessageButton()
                    .setCustomId('role_select_ping_bduyur')
                    .setLabel('Transfer Listesi Ping')
                    .setStyle('SECONDARY')
                    .setEmoji('📋'),
                new MessageButton()
                    .setCustomId('role_list')
                    .setLabel('Liste')
                    .setStyle('SUCCESS')
                    .setEmoji('📋')
            );

        const row4 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('role_reset')
                    .setLabel('Sıfırla')
                    .setStyle('DANGER')
                    .setEmoji('🗑️')
            );

        await message.reply({ 
            embeds: [embed], 
            components: [row1, row2, row3, row4]
        });
    },

    async showRoleList(message) {
        const roleData = permissions.getRoleData(message.guild.id);
        
        const listEmbed = new MessageEmbed()
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
            { key: 'tfPingRole', name: 'TF Duyuru Ping', emoji: '🔔' },
            { key: 'serbestPingRole', name: 'Serbest Duyuru Ping', emoji: '🔔' },
            { key: 'duyurPingRole', name: 'Duyur Ping', emoji: '🔔' }
        ];

        for (const roleType of roleTypes) {
            const roleId = roleData[roleType.key];
            const role = roleId ? message.guild.roles.cache.get(roleId) : null;
            
            listEmbed.addField(`${roleType.emoji} ${roleType.name}`, role ? `${role}` : '❌ Ayarlanmamış', true);
        }

        await message.reply({ embeds: [listEmbed] });
    },

    async setupRoles(message) {
        const setupEmbed = new MessageEmbed()
            .setColor(config.colors.primary)
            .setTitle(`${config.emojis.settings} Rol Ayarlama Sistemi`)
            .setDescription('Bu mesajı **yanıtlayarak** rolleri ayarlayın:\n\n**Format:** `rol_türü @rol_adı` veya `rol_türü rol_id`\n\n**Örnekler:**\n`başkan @Başkan`\n`futbolcu @Oyuncu`\n`serbest @Serbest`\n`yetkili @Transfer Admin`\n`ping_tf @TF Ping` (.offer .contract .hire .trade için)\n`ping_serbest @Serbest Ping` (.release .trelease için)\n`ping_duyur @Duyur Ping` (.duyur komutu için)\n`ping_bduyur @BDuyur Ping` (.bduyur transfer listesi için)')
            .addField('📋 Kullanılabilir Rol Türleri', '**başkan** - Transfer yapabilir\n**futbolcu** - Transfer edilebilir\n**serbest** - Serbest oyuncular\n**yetkili** - Transfer yetkilisi\n**ping_tf** - TF duyuru pingi (.offer .contract .hire .trade)\n**ping_serbest** - Serbest oyuncu pingi (.release .trelease)\n**ping_duyur** - Manuel duyuru pingi (.duyur)\n**ping_bduyur** - Transfer listesi pingi (.bduyur)', false).setFooter({ text: 'Bu mesajı yanıtlayarak rol ayarlarını yapın. Örnek: başkan @Başkan' })
            .setTimestamp();

        const sentMessage = await message.reply({ embeds: [setupEmbed] });
        
        // Mesaj filtreleme - sadece bu kullanıcıdan ve bu kanaldan
        const filter = (m) => m.author.id === message.author.id && m.channel.id === message.channel.id;
        
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 60000, 
                errors: ['time'] 
            });
            
            const responseMessage = collected.first();
            const content = responseMessage.content.trim().toLowerCase();
            
            // Komut parse etme
            const parts = content.split(' ');
            if (parts.length < 2) {
                return responseMessage.reply('❌ Hatalı format! Örnek: `başkan @Başkan` veya `futbolcu 123456789`');
            }
            
            const roleType = parts[0];
            const roleInput = parts.slice(1).join(' ');
            
            // Rol türü mapping
            const roleMapping = {
                'başkan': 'president',
                'baskan': 'president',
                'futbolcu': 'player',
                'oyuncu': 'player',
                'serbest': 'freeAgent',
                'yetkili': 'transferAuthority',
                'admin': 'transferAuthority',
                'ping_tf': 'tfPingRole',
                'tf_ping': 'tfPingRole',
                'ping_serbest': 'serbestPingRole',
                'serbest_ping': 'serbestPingRole',
                'ping_duyur': 'duyurPingRole',
                'duyur_ping': 'duyurPingRole',
                'ping_bduyur': 'bduyurPingRole',
                'bduyur_ping': 'bduyurPingRole'
            };
            
            const mappedRoleType = roleMapping[roleType];
            if (!mappedRoleType) {
                return responseMessage.reply('❌ Geçersiz rol türü! Kullanılabilir türler: başkan, futbolcu, serbest, yetkili, ping_tf, ping_serbest, ping_duyur, ping_bduyur');
            }
            
            // Rol bulma
            let role = null;
            
            // Rol mention kontrolü (<@&123>)
            const roleMatch = roleInput.match(/<@&(\d+)>/);
            if (roleMatch) {
                role = message.guild.roles.cache.get(roleMatch[1]);
            } else if (/^\d+$/.test(roleInput)) {
                // Sadece sayı ise ID olarak kabul et
                role = message.guild.roles.cache.get(roleInput);
            } else {
                // İsim ile arama (@ işareti varsa kaldır)
                const roleName = roleInput.replace('@', '');
                role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            }
            
            if (!role) {
                return responseMessage.reply('❌ Rol bulunamadı! Rol etiketini (@rol), ID\'sini veya tam ismini kontrol edin.');
            }
            
            // Rol ayarını kaydet
            permissions.setRole(message.guild.id, mappedRoleType, role.id);
            
            const roleNames = {
                'president': 'Başkan Rolü',
                'player': 'Futbolcu Rolü',
                'freeAgent': 'Serbest Futbolcu Rolü',
                'transferAuthority': 'Transfer Yetkilisi',
                'tfPingRole': 'TF Duyuru Ping',
                'serbestPingRole': 'Serbest Duyuru Ping',
                'duyurPingRole': 'Duyur Ping'
            };
            
            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle(`${config.emojis.check} Rol Ayarlandı`)
                .setDescription(`**${roleNames[mappedRoleType]}** başarıyla ${role} olarak ayarlandı!`)
                .addField('📊 Rol Bilgileri', `**Rol:** ${role.name}\n**Üye Sayısı:** ${role.members.size}\n**Rol ID:** ${role.id}`, false).setTimestamp();
                
            await responseMessage.reply({ embeds: [successEmbed] });
            
        } catch (error) {
            const timeoutEmbed = new MessageEmbed()
                .setColor(config.colors.error)
                .setTitle(`${config.emojis.cross} Zaman Aşımı`)
                .setDescription('Rol ayarlama işlemi zaman aşımına uğradı (60 saniye). Lütfen `.rol ayarla` komutunu tekrar çalıştırın.')
                .setTimestamp();
                
            await message.channel.send({ embeds: [timeoutEmbed] });
        }
    },

    async resetRoles(message) {
        try {
            permissions.resetRoles(message.guild.id);
            
            const resetEmbed = new MessageEmbed()
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
