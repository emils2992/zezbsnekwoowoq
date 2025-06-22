const config = require('../config');

class CommandHandler {
    async handleCommand(client, message) {
        try {
            // Prefix'i kaldır ve argümanları ayır
            const args = message.content.slice(config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Komutu bul
            const command = client.commands.get(commandName);
            
            if (!command) {
                // Bilinmeyen komut - sessizce geç
                return;
            }

            // Komutu çalıştır
            await command.execute(client, message, args);

        } catch (error) {
            console.error('Komut işleme hatası:', error);
            
            // Hata mesajı gönder
            const errorMessage = `❌ Komut çalıştırılırken bir hata oluştu!\n\`\`\`${error.message}\`\`\``;
            
            try {
                await message.reply(errorMessage);
            } catch (replyError) {
                console.error('Hata mesajı gönderilemedi:', replyError);
            }
        }
    }

    getCommandHelp(command) {
        let help = `**${config.prefix}${command.name}**`;
        
        if (command.description) {
            help += ` - ${command.description}`;
        }
        
        if (command.usage) {
            help += `\n**Kullanım:** ${command.usage}`;
        }
        
        return help;
    }

    async listCommands(client, message) {
        try {
            const { EmbedBuilder } = require('discord.js');
            
            const helpEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`${config.emojis.football} Transfer Bot Komutları`)
                .setDescription('Mevcut komutlar ve kullanımları:')
                .setTimestamp()
                .setFooter({ text: 'Transfer Sistemi' });

            // Komutları kategorilere ayır
            const categories = {
                'Transfer İşlemleri': ['offer', 'contract', 'trade', 'release'],
                'Duyuru & Yönetim': ['transfer-duyuru', 'serbest-ayarla', 'rol'],
            };

            for (const [category, commandNames] of Object.entries(categories)) {
                const categoryCommands = [];
                
                for (const cmdName of commandNames) {
                    const command = client.commands.get(cmdName);
                    if (command) {
                        categoryCommands.push(this.getCommandHelp(command));
                    }
                }
                
                if (categoryCommands.length > 0) {
                    helpEmbed.addFields({
                        name: `${config.emojis.handshake} ${category}`,
                        value: categoryCommands.join('\n\n'),
                        inline: false
                    });
                }
            }

            await message.reply({ embeds: [helpEmbed] });

        } catch (error) {
            console.error('Yardım komutu hatası:', error);
            message.reply('❌ Yardım mesajı gösterilirken bir hata oluştu!');
        }
    }
}

module.exports = new CommandHandler();
