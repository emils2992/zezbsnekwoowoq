const { MessageEmbed } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const PermissionManager = require('../utils/permissions');
const permissions = new PermissionManager();

module.exports = {
    name: 'tfreset',
    description: 'Transfer kayıtlarını sıfırlar (Sadece yetkililer)',
    usage: '.tfreset',
    
    async execute(client, message, args) {
        try {
            // Yetki kontrolü - sadece transfer yetkilileri kullanabilir
            if (!permissions.isTransferAuthority(message.member)) {
                return message.reply('❌ Bu komutu sadece transfer yetkilileri kullanabilir!');
            }

            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            // Veri klasörünü oluştur
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            let transfersData = {};
            if (fs.existsSync(transfersPath)) {
                transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            }

            const guildTransfers = transfersData[message.guild.id] || [];
            const transferCount = guildTransfers.length;

            if (transferCount === 0) {
                return message.reply('❌ Silinecek transfer kaydı yok!');
            }

            // Transfer kayıtlarını arşivle (silmek yerine)
            const archivePath = path.join(__dirname, '..', 'data', 'transfers_archive.json');
            let archiveData = {};
            
            if (fs.existsSync(archivePath)) {
                archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
            }

            // Arşiv verilerini hazırla
            if (!archiveData[message.guild.id]) {
                archiveData[message.guild.id] = [];
            }

            // Mevcut transferleri arşive ekle
            const archiveEntry = {
                transfers: guildTransfers,
                archivedAt: new Date().toISOString(),
                archivedBy: message.author.id,
                guildName: message.guild.name,
                resetDate: new Date().toLocaleString('tr-TR')
            };

            archiveData[message.guild.id].push(archiveEntry);

            // Bu sunucunun aktif transfer kayıtlarını temizle
            transfersData[message.guild.id] = [];
            
            // Her iki dosyayı da kaydet
            fs.writeFileSync(transfersPath, JSON.stringify(transfersData, null, 2));
            fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));

            const successEmbed = new MessageEmbed()
                .setColor(config.colors.success)
                .setTitle('✅ Transfer Kayıtları Arşivlendi')
                .setDescription(`${transferCount} transfer kaydı arşivlendi ve aktif liste temizlendi!`)
                .addFields(
                    { name: '👤 Arşivleyen', value: message.author.toString(), inline: true },
                    { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true },
                    { name: '🏢 Sunucu', value: message.guild.name, inline: true },
                    { name: '📦 Arşiv Bilgi', value: 'Kayıtlar kalıcı olarak transfers_archive.json dosyasında saklandı', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi - Arşivleme' });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('TFReset komutu hatası:', error);
            message.reply('❌ Transfer kayıtları sıfırlanırken bir hata oluştu!');
        }
    }
};