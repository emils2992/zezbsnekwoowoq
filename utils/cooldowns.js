const fs = require('fs');
const path = require('path');

class CooldownManager {
    constructor() {
        this.cooldownsPath = path.join(__dirname, '../data/cooldowns.json');
        this.ensureFile();
    }

    ensureFile() {
        try {
            if (!fs.existsSync(this.cooldownsPath)) {
                const dataDir = path.dirname(this.cooldownsPath);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                fs.writeFileSync(this.cooldownsPath, '{}');
            }
        } catch (error) {
            console.error('Cooldown file initialization error:', error);
        }
    }

    getCooldownData() {
        try {
            const data = fs.readFileSync(this.cooldownsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading cooldown data:', error);
            return {};
        }
    }

    saveCooldownData(data) {
        try {
            fs.writeFileSync(this.cooldownsPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving cooldown data:', error);
        }
    }

    // Check if user can use command (returns true if can use, false if on cooldown)
    canUseCommand(guildId, userId, commandName) {
        const cooldowns = this.getCooldownData();
        const key = `${guildId}_${userId}_${commandName}`;
        
        if (!cooldowns[key]) {
            return { canUse: true, remainingTime: 0 };
        }

        const lastUsed = new Date(cooldowns[key]);
        const now = new Date();
        const timeDiff = now - lastUsed;
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (timeDiff >= cooldownPeriod) {
            return { canUse: true, remainingTime: 0 };
        } else {
            const remainingTime = cooldownPeriod - timeDiff;
            return { canUse: false, remainingTime };
        }
    }

    // Set cooldown for user command
    setCooldown(guildId, userId, commandName) {
        const cooldowns = this.getCooldownData();
        const key = `${guildId}_${userId}_${commandName}`;
        cooldowns[key] = new Date().toISOString();
        this.saveCooldownData(cooldowns);
    }

    // Format remaining time to human readable format
    formatRemainingTime(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours} saat ${minutes} dakika`;
        } else {
            return `${minutes} dakika`;
        }
    }

    // Clean up old cooldowns (optional, for maintenance)
    cleanupOldCooldowns() {
        const cooldowns = this.getCooldownData();
        const now = new Date();
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
        
        let cleaned = false;
        for (const key in cooldowns) {
            const lastUsed = new Date(cooldowns[key]);
            if (now - lastUsed >= cooldownPeriod) {
                delete cooldowns[key];
                cleaned = true;
            }
        }
        
        if (cleaned) {
            this.saveCooldownData(cooldowns);
        }
    }
}

module.exports = CooldownManager;