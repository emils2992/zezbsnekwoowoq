const fs = require('fs');
const path = require('path');

class PermissionManager {
    constructor() {
        this.rolesPath = path.join(__dirname, '../data/roles.json');
        this.ensureRolesFile();
    }

    ensureRolesFile() {
        if (!fs.existsSync(this.rolesPath)) {
            fs.writeFileSync(this.rolesPath, JSON.stringify({}, null, 2));
        }
    }

    getRoleData(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
            return data[guildId] || {};
        } catch (error) {
            console.error('Rol verisi okuma hatası:', error);
            return {};
        }
    }

    setRole(guildId, roleType, roleId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
            if (!data[guildId]) {
                data[guildId] = {};
            }
            data[guildId][roleType] = roleId;
            fs.writeFileSync(this.rolesPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Rol ayarlama hatası:', error);
            return false;
        }
    }

    resetRoles(guildId) {
        try {
            const data = JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
            delete data[guildId];
            fs.writeFileSync(this.rolesPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Rol sıfırlama hatası:', error);
            return false;
        }
    }

    isPresident(member) {
        const roleData = this.getRoleData(member.guild.id);
        const presidentRoleId = roleData.president;
        
        if (!presidentRoleId) return false;
        return member.roles.cache.has(presidentRoleId);
    }

    isPlayer(member) {
        const roleData = this.getRoleData(member.guild.id);
        const playerRoleId = roleData.player;
        
        if (!playerRoleId) return false;
        return member.roles.cache.has(playerRoleId);
    }

    isFreeAgent(member) {
        const roleData = this.getRoleData(member.guild.id);
        const freeAgentRoleId = roleData.freeAgent;
        
        if (!freeAgentRoleId) return false;
        return member.roles.cache.has(freeAgentRoleId);
    }

    isTransferAuthority(member) {
        const roleData = this.getRoleData(member.guild.id);
        const transferAuthorityRoleId = roleData.transferAuthority;
        
        if (!transferAuthorityRoleId) return false;
        return member.roles.cache.has(transferAuthorityRoleId);
    }

    isAuthorized(member, action) {
        // Admin her zaman yetkili
        if (member.permissions.has('ADMINISTRATOR')) return true;

        switch (action) {
            case 'offer':
            case 'contract':
            case 'trade':
            case 'release':
                return this.isPresident(member);
            
            case 'transfer_announce':
                return this.isTransferAuthority(member) || this.isPresident(member);
            
            default:
                return false;
        }
    }

    async makePlayerFree(member) {
        try {
            const roleData = this.getRoleData(member.guild.id);
            const playerRoleId = roleData.player;
            const freeAgentRoleId = roleData.freeAgent;

            if (playerRoleId && member.roles.cache.has(playerRoleId)) {
                await member.roles.remove(playerRoleId);
            }

            if (freeAgentRoleId) {
                await member.roles.add(freeAgentRoleId);
            }

            return true;
        } catch (error) {
            console.error('Serbest futbolcu yapma hatası:', error);
            return false;
        }
    }

    async signPlayer(member) {
        try {
            const roleData = this.getRoleData(member.guild.id);
            const playerRoleId = roleData.player;
            const freeAgentRoleId = roleData.freeAgent;

            if (freeAgentRoleId && member.roles.cache.has(freeAgentRoleId)) {
                await member.roles.remove(freeAgentRoleId);
            }

            if (playerRoleId) {
                await member.roles.add(playerRoleId);
            }

            return true;
        } catch (error) {
            console.error('Futbolcu imzalama hatası:', error);
            return false;
        }
    }
}

module.exports = new PermissionManager();
