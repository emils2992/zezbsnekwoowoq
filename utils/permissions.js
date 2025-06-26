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
            console.log(`Role data for guild ${guildId}:`, data[guildId]);
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
        console.log('President role data:', presidentRoleId);
        
        if (!presidentRoleId) {
            console.log('No president role configured');
            return false;
        }
        const hasRole = member.roles.cache.has(presidentRoleId);
        console.log('Has president role:', hasRole);
        return hasRole;
    }

    isPlayer(member) {
        const roleData = this.getRoleData(member.guild.id);
        const playerRoleId = roleData.player;
        
        console.log('isPlayer check - Player role ID:', playerRoleId);
        console.log('isPlayer check - Member roles:', member.roles.cache.map(r => `${r.name} (${r.id})`));
        
        // Check ONLY for the specific "futbolcu" role, not free agent role
        const hasPlayerRole = playerRoleId && member.roles.cache.has(playerRoleId);
        
        console.log('isPlayer check - Has player role:', hasPlayerRole);
        console.log('isPlayer final result:', hasPlayerRole);
        return hasPlayerRole;
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
        console.log('Unilateral termination role data:', unilateralTerminationRoleId);
        
        if (!unilateralTerminationRoleId) {
            console.log('No unilateral termination role configured');
            return false;
        }
        const hasRole = member.roles.cache.has(unilateralTerminationRoleId);
        console.log('Has unilateral termination role:', hasRole);
        return hasRole;
    }

    setTransferPeriod(guildId, isOpen) {
        this.ensureRolesFile();
        
        let data = {};
        try {
            const fileContent = fs.readFileSync(this.rolesPath, 'utf8');
            data = JSON.parse(fileContent);
        } catch (error) {
            console.log('Creating new roles file');
        }

        if (!data[guildId]) {
            data[guildId] = {};
        }

        data[guildId].transferPeriodOpen = isOpen;

        fs.writeFileSync(this.rolesPath, JSON.stringify(data, null, 2));
        console.log(`Transfer period ${isOpen ? 'opened' : 'closed'} for guild ${guildId}`);
    }

    isTransferPeriodOpen(guildId) {
        const roleData = this.getRoleData(guildId);
        // Default to true if not set
        return roleData.transferPeriodOpen !== false;
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
            console.log(`🔧 DEBUG: Starting role management for ${member.displayName} (ID: ${member.id}) in guild ${guildId}`);
            
            const roleData = this.getRoleData(guildId);
            console.log(`🔧 DEBUG: Role data retrieved for guild:`, roleData);
            console.log(`🔧 DEBUG: Player role ID: ${roleData.player}, Free agent role ID: ${roleData.freeAgent}`);
            
            if (!roleData) {
                console.log('❌ No role data found for guild');
                return false;
            }
            
            // Check bot permissions first
            const botMember = member.guild.members.cache.get(member.guild.client.user.id);
            if (!botMember) {
                console.log('❌ Bot member not found in guild');
                return false;
            }
            
            if (!botMember.permissions.has('MANAGE_ROLES')) {
                console.log('❌ Bot does not have MANAGE_ROLES permission');
                return false;
            }
            
            let rolesChanged = false;
            
            // Show current user roles for debugging
            const currentRoles = member.roles.cache.map(role => `${role.name} (${role.id})`).join(', ');
            console.log(`🔧 DEBUG: User's current roles: ${currentRoles}`);
            
            // Remove player role if exists
            if (roleData.player) {
                console.log(`🔧 DEBUG: Checking player role: ${roleData.player}`);
                const playerRole = member.guild.roles.cache.get(roleData.player);
                
                if (playerRole) {
                    console.log(`🔧 DEBUG: Player role found: ${playerRole.name}`);
                    if (member.roles.cache.has(roleData.player)) {
                        console.log(`🔧 DEBUG: User has player role, attempting to remove...`);
                        // Check if bot can manage this role (bot's highest role must be higher)
                        if (botMember.roles.highest.position > playerRole.position) {
                            await member.roles.remove(playerRole);
                            console.log(`✅ Removed player role (${playerRole.name}) from ${member.displayName}`);
                            rolesChanged = true;
                        } else {
                            console.log(`❌ Cannot remove player role - bot role position (${botMember.roles.highest.position}) <= player role position (${playerRole.position})`);
                            return false;
                        }
                    } else {
                        console.log(`User doesn't have player role`);
                    }
                } else {
                    console.log(`❌ Player role ${roleData.player} not found in guild`);
                }
            } else {
                console.log(`No player role configured for guild ${guildId}`);
            }
            
            // Remove unilateral termination role if exists (for btrelease cleanup)
            if (roleData.unilateralTermination) {
                const unilateralRole = member.guild.roles.cache.get(roleData.unilateralTermination);
                if (unilateralRole && member.roles.cache.has(roleData.unilateralTermination)) {
                    if (botMember.roles.highest.position > unilateralRole.position) {
                        await member.roles.remove(unilateralRole);
                        console.log(`✅ Removed unilateral termination role (${unilateralRole.name}) from ${member.displayName}`);
                        rolesChanged = true;
                    }
                }
            }
            
            // Add free agent role if exists
            if (roleData.freeAgent) {
                console.log(`Checking free agent role: ${roleData.freeAgent}`);
                const freeAgentRole = member.guild.roles.cache.get(roleData.freeAgent);
                
                if (freeAgentRole) {
                    console.log(`Free agent role found: ${freeAgentRole.name}`);
                    if (!member.roles.cache.has(roleData.freeAgent)) {
                        console.log(`User doesn't have free agent role, attempting to add...`);
                        // Check if bot can manage this role
                        if (botMember.roles.highest.position > freeAgentRole.position) {
                            await member.roles.add(freeAgentRole);
                            console.log(`✅ Added free agent role (${freeAgentRole.name}) to ${member.displayName}`);
                            rolesChanged = true;
                        } else {
                            console.log(`❌ Cannot add free agent role - bot role position (${botMember.roles.highest.position}) <= free agent role position (${freeAgentRole.position})`);
                        }
                    } else {
                        console.log(`User already has free agent role`);
                    }
                } else {
                    console.log(`❌ Free agent role ${roleData.freeAgent} not found in guild`);
                }
            } else {
                console.log(`No free agent role configured for guild ${guildId}`);
            }
            
            console.log(`Role management completed. Roles changed: ${rolesChanged}`);
            return rolesChanged;
        } catch (error) {
            console.error('Serbest futbolcu yapma hatası:', error);
            return false;
        }
    }

    async signPlayer(member) {
        try {
            const guildId = member.guild.id;
            console.log(`🔧 DEBUG: Starting player signing for ${member.displayName} (ID: ${member.id}) in guild ${guildId}`);
            
            const roleData = this.getRoleData(guildId);
            console.log(`🔧 DEBUG: Role data retrieved for guild:`, roleData);
            console.log(`🔧 DEBUG: Free agent role ID: ${roleData.freeAgent}, Player role ID: ${roleData.player}`);
            
            if (!roleData) {
                console.log('❌ No role data found for guild');
                return false;
            }
            
            // Check bot permissions first
            const botMember = member.guild.members.cache.get(member.guild.client.user.id);
            if (!botMember) {
                console.log('❌ Bot member not found in guild');
                return false;
            }
            
            if (!botMember.permissions.has('MANAGE_ROLES')) {
                console.log('❌ Bot does not have MANAGE_ROLES permission');
                return false;
            }
            
            let rolesChanged = false;
            
            // Show current user roles for debugging
            const currentRoles = member.roles.cache.map(role => `${role.name} (${role.id})`).join(', ');
            console.log(`🔧 DEBUG: User's current roles: ${currentRoles}`);
            
            // Remove free agent role if exists
            if (roleData.freeAgent) {
                console.log(`🔧 DEBUG: Checking free agent role: ${roleData.freeAgent}`);
                const freeAgentRole = member.guild.roles.cache.get(roleData.freeAgent);
                
                if (freeAgentRole) {
                    console.log(`🔧 DEBUG: Free agent role found: ${freeAgentRole.name}`);
                    if (member.roles.cache.has(roleData.freeAgent)) {
                        console.log(`🔧 DEBUG: User has free agent role, attempting to remove...`);
                        // Check if bot can manage this role
                        if (botMember.roles.highest.position > freeAgentRole.position) {
                            await member.roles.remove(freeAgentRole);
                            console.log(`✅ Removed free agent role (${freeAgentRole.name}) from ${member.displayName}`);
                            rolesChanged = true;
                        } else {
                            console.log(`❌ Cannot remove free agent role - bot role position (${botMember.roles.highest.position}) <= free agent role position (${freeAgentRole.position})`);
                            return false;
                        }
                    } else {
                        console.log(`User doesn't have free agent role`);
                    }
                } else {
                    console.log(`❌ Free agent role ${roleData.freeAgent} not found in guild`);
                }
            } else {
                console.log(`No free agent role configured for guild ${guildId}`);
            }
            
            // Add player role if exists
            if (roleData.player) {
                console.log(`Checking player role: ${roleData.player}`);
                const playerRole = member.guild.roles.cache.get(roleData.player);
                
                if (playerRole) {
                    console.log(`Player role found: ${playerRole.name}`);
                    if (!member.roles.cache.has(roleData.player)) {
                        console.log(`User doesn't have player role, attempting to add...`);
                        // Check if bot can manage this role
                        if (botMember.roles.highest.position > playerRole.position) {
                            await member.roles.add(playerRole);
                            console.log(`✅ Added player role (${playerRole.name}) to ${member.displayName}`);
                            rolesChanged = true;
                        } else {
                            console.log(`❌ Cannot add player role - bot role position (${botMember.roles.highest.position}) <= player role position (${playerRole.position})`);
                            return false;
                        }
                    } else {
                        console.log(`User already has player role`);
                    }
                } else {
                    console.log(`❌ Player role ${roleData.player} not found in guild`);
                }
            } else {
                console.log(`No player role configured for guild ${guildId}`);
            }
            
            console.log(`Player signing completed. Roles changed: ${rolesChanged}`);
            return rolesChanged;
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

module.exports = PermissionManager;
