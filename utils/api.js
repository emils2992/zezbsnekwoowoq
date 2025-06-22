const axios = require('axios');
const config = require('../config');

class APIManager {
    async getPlayerFace() {
        try {
            // Ücretsiz yüz API'si kullan
            // Bu API her çağrıda farklı bir yüz döndürür
            const response = await axios.get(config.api.playerFaceUrl, {
                responseType: 'arraybuffer',
                timeout: 5000
            });

            // Base64'e çevir
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64Image}`;

        } catch (error) {
            console.error('Oyuncu yüzü API hatası:', error.message);
            // Hata durumunda varsayılan futbol emojisi döndür
            return 'https://via.placeholder.com/200x200/5865F2/FFFFFF?text=⚽';
        }
    }

    async getPlayerStats(playerId) {
        try {
            // Gelecekte kullanılabilecek oyuncu istatistik API'si
            // Şimdilik örnek veri döndür
            return {
                goals: Math.floor(Math.random() * 20),
                assists: Math.floor(Math.random() * 15),
                matches: Math.floor(Math.random() * 30) + 10,
                rating: (Math.random() * 3 + 7).toFixed(1) // 7.0 - 10.0 arası rating
            };
        } catch (error) {
            console.error('Oyuncu istatistik API hatası:', error.message);
            return null;
        }
    }

    async validateTransfer(fromTeam, toTeam, player, amount) {
        try {
            // Transfer geçerliliği kontrolü
            // Gelecekte dış API ile kontrol edilebilir
            const validation = {
                valid: true,
                errors: [],
                warnings: []
            };

            // Temel kontroller
            if (amount < 0) {
                validation.valid = false;
                validation.errors.push('Transfer bedeli negatif olamaz');
            }

            if (amount > 100000000) { // 100M limit
                validation.warnings.push('Çok yüksek transfer bedeli');
            }

            return validation;

        } catch (error) {
            console.error('Transfer doğrulama hatası:', error.message);
            return {
                valid: false,
                errors: ['Transfer doğrulama servisinde hata oluştu'],
                warnings: []
            };
        }
    }

    async logTransfer(transferData) {
        try {
            // Transfer geçmişini kaydet
            // Gelecekte dış servise kaydedilebilir
            console.log('Transfer kaydedildi:', {
                timestamp: new Date().toISOString(),
                type: transferData.type,
                player: transferData.player,
                from: transferData.from,
                to: transferData.to,
                amount: transferData.amount
            });

            return true;

        } catch (error) {
            console.error('Transfer kayıt hatası:', error.message);
            return false;
        }
    }

    async getMarketValue(playerId) {
        try {
            // Oyuncunun piyasa değerini hesapla
            // Basit algoritma ile örnek değer
            const baseValue = Math.floor(Math.random() * 5000000) + 500000; // 500K - 5.5M
            return baseValue;

        } catch (error) {
            console.error('Piyasa değeri hesaplama hatası:', error.message);
            return 1000000; // Varsayılan 1M
        }
    }
}

module.exports = new APIManager();
