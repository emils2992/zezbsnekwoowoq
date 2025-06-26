const fs = require('fs');
const path = require('path');

class TransferTracker {
    constructor() {
        this.transferredPlayersFile = path.join(__dirname, '..', 'data', 'transferred_players.json');
        this.ensureFile();
    }

    ensureFile() {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.transferredPlayersFile)) {
            fs.writeFileSync(this.transferredPlayersFile, JSON.stringify({}));
        }
    }

    getTransferredPlayers(guildId) {
        try {
            const data = fs.readFileSync(this.transferredPlayersFile, 'utf8');
            const allData = JSON.parse(data);
            return allData[guildId] || [];
        } catch (error) {
            console.error('Transfer kayıtları okunamadı:', error);
            return [];
        }
    }

    saveTransferredPlayers(guildId, playerList) {
        try {
            const data = fs.readFileSync(this.transferredPlayersFile, 'utf8');
            const allData = JSON.parse(data);
            allData[guildId] = playerList;
            fs.writeFileSync(this.transferredPlayersFile, JSON.stringify(allData, null, 2));
        } catch (error) {
            console.error('Transfer kayıtları kaydedilemedi:', error);
        }
    }

    // Oyuncuyu transfer yapıldı olarak işaretle
    markPlayerAsTransferred(guildId, playerId, transferType = 'transfer') {
        const transferredPlayers = this.getTransferredPlayers(guildId);
        
        // Oyuncu zaten transfer edilmişse güncelle, yoksa ekle
        const existingIndex = transferredPlayers.findIndex(p => p.playerId === playerId);
        const transferData = {
            playerId: playerId,
            transferType: transferType,
            timestamp: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            transferredPlayers[existingIndex] = transferData;
        } else {
            transferredPlayers.push(transferData);
        }

        this.saveTransferredPlayers(guildId, transferredPlayers);
        console.log(`Oyuncu transfer edildi olarak işaretlendi: ${playerId} - ${transferType}`);
    }

    // Oyuncunun transfer yapılıp yapılmadığını kontrol et
    isPlayerTransferred(guildId, playerId) {
        const transferredPlayers = this.getTransferredPlayers(guildId);
        const playerRecord = transferredPlayers.find(p => p.playerId === playerId);
        
        if (playerRecord) {
            console.log(`Oyuncu transfer kontrolü: ${playerId} - Transfer edilmiş (${playerRecord.transferType})`);
            return {
                isTransferred: true,
                transferType: playerRecord.transferType,
                timestamp: playerRecord.timestamp
            };
        }
        
        return {
            isTransferred: false,
            transferType: null,
            timestamp: null
        };
    }

    // Transfer dönemini sıfırla (tüm transfer kayıtlarını temizle)
    resetTransferPeriod(guildId) {
        this.saveTransferredPlayers(guildId, []);
        console.log(`Transfer dönemi sıfırlandı: ${guildId}`);
    }

    // Belirli bir oyuncunun transfer kaydını sil
    removePlayerTransfer(guildId, playerId) {
        const transferredPlayers = this.getTransferredPlayers(guildId);
        const filteredPlayers = transferredPlayers.filter(p => p.playerId !== playerId);
        this.saveTransferredPlayers(guildId, filteredPlayers);
        console.log(`Oyuncu transfer kaydı silindi: ${playerId}`);
    }

    // Guild'deki tüm transfer kayıtlarını getir
    getAllTransfers(guildId) {
        return this.getTransferredPlayers(guildId);
    }
}

module.exports = TransferTracker;