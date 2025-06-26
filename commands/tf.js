const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'tf',
    description: 'Tamamlanan transferleri listeler',
    usage: '.tf',
    
    async execute(client, message, args) {
        try {
            const transfersPath = path.join(__dirname, '..', 'data', 'transfers.json');
            
            if (!fs.existsSync(transfersPath)) {
                return message.reply('❌ Henüz hiç transfer kaydı yok!');
            }

            const transfersData = JSON.parse(fs.readFileSync(transfersPath, 'utf8'));
            const guildTransfers = transfersData[message.guild.id] || [];

            if (guildTransfers.length === 0) {
                return message.reply('❌ Bu sunucuda henüz hiç transfer kaydı yok!');
            }

            // Sayfalama için 10'ar transfer göster
            const transfersPerPage = 10;
            const totalPages = Math.ceil(guildTransfers.length / transfersPerPage);
            const currentPage = 1;

            const startIndex = (currentPage - 1) * transfersPerPage;
            const endIndex = startIndex + transfersPerPage;
            const currentTransfers = guildTransfers.slice(startIndex, endIndex);

            const embed = new MessageEmbed()
                .setColor(config.colors.primary)
                .setTitle(`📋 Transfer Listesi - Sayfa ${currentPage}/${totalPages}`)
                .setDescription(`Toplam ${guildTransfers.length} transfer kaydı`)
                .setTimestamp()
                .setFooter({ text: 'Transfer Takip Sistemi' });

            currentTransfers.forEach((transfer, index) => {
                const transferIndex = startIndex + index + 1;
                let transferText = `**${transferIndex}.** ${transfer.player}`;
                
                if (transfer.type === 'offer') {
                    // Serbest transfer - eski kulüp gösterme
                    transferText += `\n📥 Yeni Kulüp: ${transfer.toTeam}`;
                } else if (transfer.type === 'trade') {
                    // Takas - özel format
                    transferText += `\n🔄 ${transfer.fromTeam} ↔ ${transfer.toTeam}`;
                } else {
                    // Diğer transferler - tam bilgi
                    transferText += `\n📤 Eski Kulüp: ${transfer.fromTeam}`;
                    transferText += `\n📥 Yeni Kulüp: ${transfer.toTeam}`;
                }
                
                transferText += `\n📅 ${transfer.date}`;
                
                embed.addFields({ name: `${config.emojis.football || '⚽'} ${transfer.type.toUpperCase()}`, value: transferText, inline: false });
            });

            // Sayfa butonları
            const buttons = new MessageActionRow();
            
            if (currentPage > 1) {
                buttons.addComponents(
                    new MessageButton()
                        .setCustomId(`tf_prev_${currentPage - 1}`)
                        .setLabel('◀ Önceki')
                        .setStyle('SECONDARY')
                );
            }

            if (currentPage < totalPages) {
                buttons.addComponents(
                    new MessageButton()
                        .setCustomId(`tf_next_${currentPage + 1}`)
                        .setLabel('Sonraki ▶')
                        .setStyle('SECONDARY')
                );
            }

            const messageData = { embeds: [embed] };
            if (buttons.components.length > 0) {
                messageData.components = [buttons];
            }

            await message.reply(messageData);

        } catch (error) {
            console.error('TF komutu hatası:', error);
            message.reply('❌ Transfer listesi gösterilirken bir hata oluştu!');
        }
    }
};