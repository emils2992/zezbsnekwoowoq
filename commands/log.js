const { MessageEmbed } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'log',
    description: 'Global log kanalını ayarlar',
    usage: '.log #kanal',
    
    async execute(client, message, args) {
        try {
            // Yönetici kontrolü
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ Bu komutu sadece yöneticiler kullanabilir!');
            }

            // Kanal kontrolü
            if (args.length === 0 || !message.mentions.channels.first()) {
                return message.reply('❌ Lütfen bir kanal etiketleyin! Kullanım: `.log #kanal`');
            }

            const logChannel = message.mentions.channels.first();
            
            // Kanal tipi kontrolü
            if (logChannel.type !== 'GUILD_TEXT') {
                return message.reply('❌ Sadece metin kanalları log kanalı olarak ayarlanabilir!');
            }

            // Log verilerini kaydet
            const logDataPath = path.join(__dirname, '..', 'data', 'globalLog.json');
            const logData = {
                channelId: logChannel.id,
                guildId: message.guild.id,
                setBy: message.author.id,
                setAt: new Date().toISOString()
            };

            // Data klasörünü oluştur
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // JSON dosyasını kaydet
            fs.writeFileSync(logDataPath, JSON.stringify(logData, null, 2));

            // Başarı mesajı
            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Global Log Kanalı Ayarlandı')
                .setDescription(`Global log kanalı ${logChannel} olarak ayarlandı!`)
                .addFields(
                    { name: '📝 Kanal', value: logChannel.toString(), inline: true },
                    { name: '👤 Ayarlayan', value: message.author.toString(), inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                )
                .addField('ℹ️ Bilgi', 'Artık tüm sunuculardan gelen duyurular bu kanala yazılacak.')
                .setTimestamp()
                .setFooter({ text: 'Global Log Sistemi' });

            await message.reply({ embeds: [successEmbed] });

            // Test mesajı gönder
            const testEmbed = new MessageEmbed()
                .setColor(config.colors.info)
                .setTitle('🔧 Global Log Sistemi Aktif')
                .setDescription('Bu kanal artık tüm sunuculardan gelen duyuruları alacak.')
                .addFields(
                    { name: '🏠 Ana Sunucu', value: message.guild.name, inline: true },
                    { name: '🌐 Durum', value: 'Aktif', inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('Log komutu hatası:', error);
            message.reply('❌ Log kanalı ayarlanırken bir hata oluştu!');
        }
    }
};