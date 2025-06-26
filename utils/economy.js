const fs = require('fs');
const path = require('path');

class EconomyManager {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data', 'economy.json');
        this.shopPath = path.join(__dirname, '..', 'data', 'shop.json');
        this.ensureFiles();
    }

    ensureFiles() {
        // Ensure data directory exists
        const dataDir = path.dirname(this.dataPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Ensure economy.json exists
        if (!fs.existsSync(this.dataPath)) {
            fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 2));
        }

        // Ensure shop.json exists
        if (!fs.existsSync(this.shopPath)) {
            fs.writeFileSync(this.shopPath, JSON.stringify({}, null, 2));
        }
    }

    getEconomyData(guildId) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        return data[guildId] || {};
    }

    saveEconomyData(guildId, economyData) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        data[guildId] = economyData;
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    }

    getShopData(guildId) {
        const data = JSON.parse(fs.readFileSync(this.shopPath, 'utf8'));
        return data[guildId] || {};
    }

    saveShopData(guildId, shopData) {
        const data = JSON.parse(fs.readFileSync(this.shopPath, 'utf8'));
        data[guildId] = shopData;
        fs.writeFileSync(this.shopPath, JSON.stringify(data, null, 2));
    }

    getUserData(guildId, userId) {
        const economyData = this.getEconomyData(guildId);
        return economyData[userId] || {
            cash: 0,
            bank: 0,
            lastWork: 0
        };
    }

    setUserData(guildId, userId, userData) {
        const economyData = this.getEconomyData(guildId);
        economyData[userId] = userData;
        this.saveEconomyData(guildId, economyData);
    }

    // Para formatını çevir (5k, 5e3, 5K -> 5000)
    parseAmount(amountStr) {
        if (!amountStr) return null;
        
        // Clean the string: remove spaces, € symbols, and convert to lowercase
        let str = amountStr.toString().toLowerCase().trim().replace(/€/g, '').replace(/\s/g, '');
        
        // e3, e6 gibi scientific notation
        if (str.includes('e')) {
            const [base, exp] = str.split('e');
            return parseFloat(base) * Math.pow(10, parseInt(exp));
        }
        
        // k, m, b gibi kısaltmalar (case insensitive)
        if (str.endsWith('k')) {
            return parseFloat(str.slice(0, -1)) * 1000;
        }
        if (str.endsWith('m')) {
            return parseFloat(str.slice(0, -1)) * 1000000;
        }
        if (str.endsWith('b')) {
            return parseFloat(str.slice(0, -1)) * 1000000000;
        }
        
        // Normal sayı
        const parsed = parseInt(str);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Para formatını göster (5000 -> 5K)
    formatAmount(amount) {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(1) + 'B';
        }
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }

    // Para transferi
    transferMoney(guildId, fromUserId, toUserId, amount) {
        const fromUser = this.getUserData(guildId, fromUserId);
        const toUser = this.getUserData(guildId, toUserId);

        if (fromUser.cash < amount) {
            return { success: false, message: 'Yetersiz bakiye!' };
        }

        fromUser.cash -= amount;
        toUser.cash += amount;

        this.setUserData(guildId, fromUserId, fromUser);
        this.setUserData(guildId, toUserId, toUser);

        return { success: true };
    }

    // Para ekleme/çıkarma (yetkililer için)
    adjustMoney(guildId, userId, amount, type = 'cash') {
        const userData = this.getUserData(guildId, userId);
        userData[type] += amount;
        
        if (userData[type] < 0) {
            userData[type] = 0;
        }
        
        this.setUserData(guildId, userId, userData);
        return userData;
    }

    // Çalışma sistemi
    canWork(guildId, userId) {
        const userData = this.getUserData(guildId, userId);
        const now = Date.now();
        const cooldown = 60000; // 1 dakika
        
        return (now - userData.lastWork) >= cooldown;
    }

    work(guildId, userId) {
        if (!this.canWork(guildId, userId)) {
            const userData = this.getUserData(guildId, userId);
            const timeLeft = 60000 - (Date.now() - userData.lastWork);
            return { 
                success: false, 
                timeLeft: Math.ceil(timeLeft / 1000),
                message: `${Math.ceil(timeLeft / 1000)} saniye sonra tekrar çalışabilirsin!` 
            };
        }

        const userData = this.getUserData(guildId, userId);
        const earnings = 200; // Sabit 200 para
        
        userData.cash += earnings;
        userData.lastWork = Date.now();
        
        this.setUserData(guildId, userId, userData);
        
        return { 
            success: true, 
            earnings: earnings,
            newBalance: userData.cash 
        };
    }

    // Banka işlemleri
    deposit(guildId, userId, amount) {
        const userData = this.getUserData(guildId, userId);
        
        if (userData.cash < amount) {
            return { success: false, message: 'Yetersiz nakit!' };
        }
        
        userData.cash -= amount;
        userData.bank += amount;
        
        this.setUserData(guildId, userId, userData);
        
        return { success: true, newCash: userData.cash, newBank: userData.bank };
    }

    withdraw(guildId, userId, amount) {
        const userData = this.getUserData(guildId, userId);
        
        if (userData.bank < amount) {
            return { success: false, message: 'Bankada yetersiz para!' };
        }
        
        userData.bank -= amount;
        userData.cash += amount;
        
        this.setUserData(guildId, userId, userData);
        
        return { success: true, newCash: userData.cash, newBank: userData.bank };
    }

    // Leaderboard
    getLeaderboard(guildId, page = 1, limit = 10) {
        const economyData = this.getEconomyData(guildId);
        const users = Object.entries(economyData).map(([userId, data]) => ({
            userId,
            total: data.cash + data.bank,
            cash: data.cash,
            bank: data.bank
        }));

        users.sort((a, b) => b.total - a.total);

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const pageUsers = users.slice(startIndex, endIndex);

        return {
            users: pageUsers,
            totalPages: Math.ceil(users.length / limit),
            currentPage: page,
            totalUsers: users.length
        };
    }

    // Shop işlemleri
    addShopItem(guildId, itemName, price, emoji = '📦') {
        const shopData = this.getShopData(guildId);
        shopData[itemName] = {
            price: price,
            emoji: emoji
        };
        this.saveShopData(guildId, shopData);
    }

    removeShopItem(guildId, itemName) {
        const shopData = this.getShopData(guildId);
        
        if (!shopData[itemName]) {
            return { success: false, error: 'Bu ürün mağazada bulunamadı!' };
        }
        
        delete shopData[itemName];
        this.saveShopData(guildId, shopData);
        return { success: true };
    }

    buyShopItem(guildId, userId, itemName) {
        const shopData = this.getShopData(guildId);
        const userData = this.getUserData(guildId, userId);

        if (!shopData[itemName]) {
            return { success: false, message: 'Bu ürün mağazada bulunmuyor!' };
        }

        const itemData = shopData[itemName];
        const price = typeof itemData === 'object' ? itemData.price : itemData;
        const emoji = typeof itemData === 'object' ? itemData.emoji : '📦';

        if (userData.cash < price) {
            return { success: false, message: 'Yetersiz bakiye!' };
        }

        userData.cash -= price;
        
        // Envanterine ürün ekle
        if (!userData.inventory) {
            userData.inventory = {};
        }
        
        if (!userData.inventory[itemName]) {
            userData.inventory[itemName] = { count: 0, emoji: emoji };
        }
        
        userData.inventory[itemName].count += 1;
        userData.inventory[itemName].emoji = emoji;
        
        this.setUserData(guildId, userId, userData);

        return { 
            success: true, 
            item: itemName, 
            price: price, 
            newBalance: userData.cash 
        };
    }

    getShopItems(guildId) {
        return this.getShopData(guildId);
    }
}

module.exports = EconomyManager;