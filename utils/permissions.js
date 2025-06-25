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

    canUseUnilateralTermination(member) {
        const roleData = this.getRoleData(member.guild.id);
        const unilateralTerminationRoleId = roleData.unilateralTermination;
        
        if (!unilateralTerminationRoleId) return false;
        return member.roles.cache.has(unilateralTerminationRoleId);
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
            const guildId = member.guild.id;
            const roleData = this.getRoleData(guildId);
            
            // Check bot permissions first
            const botMember = member.guild.members.cache.get(member.guild.client.user.id);
            if (!botMember.permissions.has('MANAGE_ROLES')) {
                console.log('Bot does not have MANAGE_ROLES permission');
                return false;
            }
            
            // Remove player role if exists
            if (roleData.player) {
                const playerRole = member.guild.roles.cache.get(roleData.player);
                if (playerRole && member.roles.cache.has(roleData.player)) {
                    // Check if bot can manage this role (bot's highest role must be higher)
                    if (botMember.roles.highest.position > playerRole.position) {
                        await member.roles.remove(playerRole);
                        console.log(`Removed player role from ${member.displayName}`);
                    } else {
                        console.log(`Cannot remove player role - bot role position too low`);
                        return false;
                    }
                }
            }
            
            // Add free agent role if exists
            if (roleData.freeAgent) {
                const freeAgentRole = member.guild.roles.cache.get(roleData.freeAgent);
                if (freeAgentRole && !member.roles.cache.has(roleData.freeAgent)) {
                    // Check if bot can manage this role
                    if (botMember.roles.highest.position > freeAgentRole.position) {
                        await member.roles.add(freeAgentRole);
                        console.log(`Added free agent role to ${member.displayName}`);
                    } else {
                        console.log(`Cannot add free agent role - bot role position too low`);
                    }
                }
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

    getTransferAuthorities(guild) {
        try {
            const roleData = this.getRoleData(guild.id);
            const authorities = [];
            
            if (roleData.transferAuthority) {
                const role = guild.roles.cache.get(roleData.transferAuthority);
                if (role) authorities.push(role);
            }
            
            return authorities;
        } catch (error) {
            console.error('Transfer yetkilileri alınırken hata:', error);
            return [];
        }
    }
}

module.exports = new PermissionManager();
