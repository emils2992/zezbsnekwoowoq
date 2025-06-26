const { MessageEmbed } = require('discord.js');
const EconomyManager = require('../utils/economy');
const EconomyLogger = require('../utils/economyLogger');

module.exports = {
    name: 'pay',
    description: 'Başka bir kullanıcıya para gönder',
    usage: '.pay @kullanıcı miktar',
    
    async execute(client, message, args) {
        const economy = new EconomyManager();
        const logger = new EconomyLogger();

        // Kullanıcı ve miktar kontrolü
        if (args.length < 2) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kullanım: `.pay @kullanıcı miktar`\nÖrnek: `.pay @john 5k`');
            return message.reply({ embeds: [embed] });
        }

        // Hedef kullanıcıyı bul
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir kullanıcı etiketleyin!');
            return message.reply({ embeds: [embed] });
        }

        // Kendine para göndermeyi engelle
        if (targetUser.id === message.author.id) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Kendinize para gönderemezsiniz!');
            return message.reply({ embeds: [embed] });
        }

        // Miktarı parse et
        const amount = economy.parseAmount(args[1]);
        if (!amount || amount <= 0) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Hata')
                .setDescription('Lütfen geçerli bir miktar girin!\nÖrnekler: `5k`, `5e3`, `5000`');
            return message.reply({ embeds: [embed] });
        }

        // Para transferini gerçekleştir
        const result = economy.transferMoney(message.guild.id, message.author.id, targetUser.id, amount);

        if (!result.success) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('❌ Transfer Başarısız')
                .setDescription(result.message);
            return message.reply({ embeds: [embed] });
        }

        // Başarılı transfer mesajı
        const senderData = economy.getUserData(message.guild.id, message.author.id);
        const receiverData = economy.getUserData(message.guild.id, targetUser.id);

        const embed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('✅ Para Transferi Başarılı')
            .setDescription(`**${economy.formatAmount(amount)}** para ${targetUser} kullanıcısına gönderildi!`)
            .addField('Gönderen Yeni Bakiye', `💰 ${economy.formatAmount(senderData.cash)}`, true)
            .addField('Alan Yeni Bakiye', `💰 ${economy.formatAmount(receiverData.cash)}`, true)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // Ekonomi loguna kaydet
        await logger.logTransaction(client, message.guild.id, {
            type: 'pay',
            fromUser: message.author.id,
            toUser: targetUser.id,
            amount: economy.formatAmount(amount)
        });

        // Check for pending transfers
        const pendingPayments = global.pendingPayments || new Map();
        const channelPayment = pendingPayments.get(message.channel.id);
        
        if (channelPayment) {
            if (channelPayment.type === 'trade') {
                // Handle trade dual payments
                await this.handleTradePayment(client, message, channelPayment, targetUser, amount, economy);
            } else if (channelPayment.payerId === message.author.id && 
                       channelPayment.receiverId === targetUser.id) {
                
                // Handle single transfer payments (offer, contract, hire)
                const paidAmount = amount;
                const requiredAmount = economy.parseAmount(channelPayment.amount);
                
                if (paidAmount === requiredAmount) {
                    // Payment confirmed - complete transfer
                    await this.completeTransfer(client, message, channelPayment);
                    pendingPayments.delete(message.channel.id);
                } else {
                    // Wrong amount - mute user for 5 hours
                    await this.handleWrongPayment(message, paidAmount, requiredAmount);
                }
            }
        }
    },

    async completeTransfer(client, message, channelPayment) {
        const { MessageEmbed } = require('discord.js');
        const PermissionManager = require('../utils/permissions');
        const permissions = new PermissionManager();
        const ButtonHandler = require('../handlers/buttonHandler');
        const buttonHandler = new ButtonHandler();

        // Complete the transfer based on type
        if (channelPayment.type === 'offer') {
            // Send transfer announcement
            await buttonHandler.sendTransferAnnouncement(message.guild, {
                type: 'offer',
                player: channelPayment.playerUser,
                president: channelPayment.presidentUser,
                embed: channelPayment.embed
            });

            // Role management - remove free agent role and add player role
            try {
                await permissions.signPlayer(channelPayment.playerUser);
                console.log(`Completed role change for ${channelPayment.playerUser.displayName}`);
            } catch (error) {
                console.error('Role management error:', error);
            }
        } else if (channelPayment.type === 'contract') {
            // Send contract transfer announcement
            await buttonHandler.sendTransferAnnouncement(message.guild, {
                type: 'contract',
                player: channelPayment.playerUser,
                president: channelPayment.presidentUser,
                embed: channelPayment.embed
            });
        } else if (channelPayment.type === 'hire') {
            // Send hire transfer announcement
            await buttonHandler.sendTransferAnnouncement(message.guild, {
                type: 'hire',
                player: channelPayment.playerUser,
                president: channelPayment.presidentUser,
                embed: channelPayment.embed
            });
        }

        // Send completion message
        const completionEmbed = new MessageEmbed()
            .setColor('#00FF00')
            .setTitle('✅ Transfer Tamamlandı')
            .setDescription('Ödeme doğrulandı! Transfer işlemi başarıyla tamamlandı.')
            .setTimestamp();

        await message.channel.send({ embeds: [completionEmbed] });

        // Delete channel after 5 seconds
        setTimeout(async () => {
            try {
                if (message.channel && message.channel.deletable) {
                    await message.channel.delete("Transfer tamamlandı - Ödeme onaylandı");
                }
            } catch (error) {
                console.error('Channel deletion error:', error);
            }
        }, 5000);
    },

    async handleWrongPayment(message, paidAmount, requiredAmount) {
        const { MessageEmbed } = require('discord.js');
        const economy = new (require('../utils/economy'))();

        const errorEmbed = new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('❌ Yanlış Miktar!')
            .setDescription(`**Hata:** Yanlış miktar gönderdin!\n**Beklenen:** ${economy.formatAmount(requiredAmount)}\n**Gönderilen:** ${economy.formatAmount(paidAmount)}`)
            .addField('⚠️ Ceza', '5 Saat mute alacaksın! Telafisi var, doğru miktarı gönder.', false)
            .setTimestamp();

        await message.channel.send({ embeds: [errorEmbed] });

        // Mute user for 5 hours
        try {
            const member = message.member;
            if (member) {
                await member.timeout(5 * 60 * 60 * 1000, 'Transfer ödeme miktarı yanlış'); // 5 hours
                console.log(`${member.displayName} muted for 5 hours due to wrong payment amount`);
            }
        } catch (error) {
            console.error('Mute error:', error);
        }
    },

    async handleTradePayment(client, message, channelPayment, targetUser, amount, economy) {
        const { MessageEmbed } = require('discord.js');
        const ButtonHandler = require('../handlers/buttonHandler');
        const buttonHandler = new ButtonHandler();

        // Check which president is paying
        let isValidPayment = false;
        let paymentRole = '';
        
        if (channelPayment.payerId1 === message.author.id && 
            channelPayment.receiverId1 === targetUser.id) {
            // President 1 payment
            const requiredAmount = economy.parseAmount(channelPayment.amount1);
            if (amount === requiredAmount) {
                channelPayment.payments.president = true;
                paymentRole = 'president1';
                isValidPayment = true;
            } else {
                await this.handleWrongPayment(message, amount, requiredAmount);
                return;
            }
        } else if (channelPayment.payerId2 === message.author.id && 
                   channelPayment.receiverId2 === targetUser.id) {
            // President 2 payment
            const requiredAmount = economy.parseAmount(channelPayment.amount2);
            if (amount === requiredAmount) {
                channelPayment.payments.targetPresident = true;
                paymentRole = 'president2';
                isValidPayment = true;
            } else {
                await this.handleWrongPayment(message, amount, requiredAmount);
                return;
            }
        }

        if (isValidPayment) {
            // Update payment tracking
            const pendingPayments = global.pendingPayments || new Map();
            pendingPayments.set(message.channel.id, channelPayment);

            // Check if both presidents have paid
            if (channelPayment.payments.president && channelPayment.payments.targetPresident) {
                // Both payments completed - complete trade
                await buttonHandler.sendTransferAnnouncement(message.guild, {
                    type: 'trade',
                    wantedPlayer: channelPayment.wantedPlayerUser,
                    givenPlayer: channelPayment.givenPlayerUser,
                    targetPresident: channelPayment.targetPresidentUser,
                    president: channelPayment.presidentUser,
                    embed: channelPayment.embed,
                    tradeData: channelPayment.tradeData
                });

                const completionEmbed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('✅ Takas Tamamlandı')
                    .setDescription('Her iki başkan da ödeme yaptı! Takas başarıyla tamamlandı.')
                    .setTimestamp();

                await message.channel.send({ embeds: [completionEmbed] });

                // Delete payment tracking and channel
                pendingPayments.delete(message.channel.id);
                
                setTimeout(async () => {
                    try {
                        if (message.channel && message.channel.deletable) {
                            await message.channel.delete("Takas tamamlandı - Her iki ödeme onaylandı");
                        }
                    } catch (error) {
                        console.error('Channel deletion error:', error);
                    }
                }, 5000);
            } else {
                // One payment completed, waiting for the other
                const waitingFor = channelPayment.payments.president ? 
                    channelPayment.targetPresidentUser : channelPayment.presidentUser;
                
                const statusEmbed = new MessageEmbed()
                    .setColor('#FFD700')
                    .setTitle('⏳ Ödeme Bekleniyor')
                    .setDescription(`Bir ödeme tamamlandı! ${waitingFor} ödeme yapması bekleniyor.`)
                    .setTimestamp();

                await message.channel.send({ embeds: [statusEmbed] });
            }
        }
    }
};