# Discord Football Transfer Bot

## Overview

This is a Discord bot designed to manage football (soccer) transfer negotiations between team presidents and players. The bot facilitates offer submissions, contract negotiations, player releases, and trades through an interactive embed and button-based system.

## System Architecture

The bot is built using Node.js with the Discord.js v14 library and follows a modular command-handler pattern. The architecture consists of several key layers:

- **Bot Core**: Main Discord client handling events and interactions
- **Command System**: Modular command handlers for different transfer operations
- **Handler Layer**: Separate handlers for commands and button interactions
- **Utility Layer**: Helper classes for permissions, embeds, channels, and API integrations
- **Data Layer**: JSON file-based storage for role configurations

## Key Components

### Bot Client (`index.js`)
- Initializes Discord client with necessary intents
- Loads and manages command collection
- Handles message and interaction events
- Sets up event listeners for commands and buttons

### Command Handler (`handlers/commandHandler.js`)
- Processes prefix-based commands
- Routes commands to appropriate handlers
- Provides error handling and help functionality

### Button Handler (`handlers/buttonHandler.js`)
- Manages Discord button interactions
- Handles modals for form submissions
- Routes different button types (offer, contract, trade, release, role)

### Commands Directory
- **offer.js**: Handles transfer offers to free agents
- **contract.js**: Manages contract negotiations between presidents
- **trade.js**: Facilitates player trades between teams
- **release.js**: Handles player releases (mutual or unilateral)
- **rol.js**: Admin role management system
- **transfer-duyuru.js**: Sets up transfer announcement channels
- **serbest-ayarla.js**: Configures free agent announcement channels

### Utility Classes

#### Permission Manager (`utils/permissions.js`)
- Manages role-based permissions
- Handles president, player, and free agent role validation
- Stores role configurations in JSON format

#### Embed Creator (`utils/embeds.js`)
- Creates formatted Discord embeds for various transfer scenarios
- Standardizes visual presentation across all bot interactions

#### Channel Manager (`utils/channels.js`)
- Creates private negotiation channels
- Manages channel permissions for transfer discussions

#### API Manager (`utils/api.js`)
- Handles external API integrations
- Provides player face images and statistics
- Includes validation systems for transfers

## Data Flow

1. **Command Input**: User sends prefix-based command (`.offer @player`)
2. **Permission Check**: System validates user roles and permissions
3. **Modal/Form Display**: Interactive forms collect transfer details
4. **Button Interactions**: Users interact with embed buttons for responses
5. **Channel Creation**: Private negotiation channels created when needed
6. **Data Storage**: Role configurations and transfer data stored in JSON files

## External Dependencies

- **discord.js**: Core Discord API wrapper (v14.20.0)
- **axios**: HTTP client for external API calls (v1.10.0)
- **Node.js**: Runtime environment (v20)

### Third-party Integrations
- **thispersondoesnotexist.com**: Provides random player face images
- **Placeholder image service**: Fallback for image failures

## Deployment Strategy

The bot is configured for Replit deployment with:
- Automated dependency installation
- Environment variable support for Discord token
- Continuous running capability
- Shell execution for bot startup

### Environment Requirements
- `DISCORD_TOKEN`: Bot token from Discord Developer Portal
- Node.js 20+ runtime environment
- File system access for JSON data storage

### Configuration
- Bot prefix: `.` (configurable in config.js)
- Color scheme: Discord branding colors
- Emoji system: Football-themed emojis for enhanced UX

## Changelog

- June 22, 2025. Initial setup
- June 22, 2025. Complete modal system implementation for all transfer commands:
  - Updated .offer command to use interactive modal forms with team name, player name, salary, years, and bonus fields
  - Updated .contract command to use modal forms with transfer fee, salary, contract duration, and bonus inputs
  - Updated .trade command to use modal forms with additional amount, salary, duration, and bonus fields
  - Updated .release command with dual handling: modal forms for mutual termination with compensation details, and simple yes/no confirmation for unilateral termination with automatic announcements
  - Added comprehensive modal submission handlers in index.js for all transfer types
  - Enhanced button handler with modal display methods for all transfer commands
  - Implemented automatic announcement system for unilateral releases
- June 22, 2025. Fixed modal interaction timeout issues and data consistency:
  - Resolved Discord API timeout errors by implementing deferReply/editReply pattern for all modal submissions
  - Fixed transfer announcements to use exact modal form data instead of default values
  - Enhanced button handler to extract and use modal data from embed fields for accurate transfer announcements
  - Changed salary format from monthly to yearly across all forms and announcements
- June 22, 2025. Enhanced modal system with user-requested improvements:
  - Updated "Tekrar Düzenle" button to open modal forms directly without creating new negotiation channels
  - Replaced "Bonuslar" field with "İstenen Oyuncu" in trade and offer forms for better trade negotiations
  - Modified trade transfer announcements to display "Başkanlar takasladi" message instead of generic club transfer text
  - Ensured complete modal data consistency across all transfer types (offer, contract, trade, release)
  - Enhanced release system to extract modal data and create detailed free agent announcements in serbest-ayarla channel
  - Eliminated separate transfer announcements for releases - only enhanced free agent announcements using exact modal input
  - Separated release commands: .release for mutual termination (karşılıklı fesih) and .trelease for unilateral termination (tek taraflı fesih)
  - Both commands create negotiation channels like other transfers, only sending announcements to serbest-duyuru when accepted
  - Fixed modal data consistency across contract and trade negotiations - data flows accurately from initial form through all stages
  - Enhanced channel permissions to include transfer authorities alongside participants for proper oversight
  - Corrected transfer announcements to use exact modal input rather than default values
  - Implemented automatic channel cleanup after release decisions (3-5 second delay)
- June 23, 2025. Major system improvements and new features:
  - Fixed serbest-ayarla command to properly save channel configuration in JSON for automated release announcements
  - Enhanced release modal data display - forms now correctly show user input in embeds instead of default values
  - Changed trade "Sende Yap" button to "Düzenle" button that reopens modal forms for editing
  - Updated trade announcement format to display "**Player1** <> **Player2**" with "Başkanlar takasladi" message
  - Kept bonus fields in offer forms while removing them from trade forms (replaced with "İstenen Oyuncu")
  - Set negotiations category to position at top of server (position: 0)
  - Added .duyur command for free agents to create their own announcement posts via modal forms
  - Added .duyur-ayarla command to configure dedicated announcement channels for free agent posts
  - Enhanced channel finding system to use saved configurations from JSON instead of hardcoded names
  - Updated release embed creation to properly display modal form data with proper field names
  - Fixed all modal data extraction and consistency issues across transfer, trade, contract, and release systems
  - Made all duyuru form fields mandatory (player name, new club, salary, contract years, bonus)
  - Replaced random generated player faces with actual Discord user avatars in all transfer and free agent announcements
  - Updated announcement structure to display comprehensive transfer information with required details
  - Fixed .offer command role checking to only require free agent role (not both player and free agent roles)
  - Updated .release command permissions to allow both team presidents and free agents to use it
  - Fixed .release command to work with users who have either serbest futbolcu or futbolcu roles
  - Made all modal form fields required across all commands (offer, contract, trade, release) for essential information
  - Enhanced announcements to only display populated fields, hiding empty ones for cleaner presentation
  - Added .eyardım command with comprehensive help menu explaining all bot features and usage
  - Enhanced negotiations category positioning to always stay at the top of the server
  - Extended .rol command with ping role options for transfer, free agent, and announcement notifications
  - Implemented role mention system in all announcements - transfer, free agent, and player duyuru posts
  - Updated role management interface with dedicated ping role buttons for each announcement type
  - Enhanced announcement system to automatically mention configured ping roles when transfers are completed
  - Fixed .contract command modal structure with "Yeni Kulüp" field replacing bonus field and updated to use yearly salary format
  - Corrected .trelease command color configuration error preventing unilateral termination from working properly
  - Completely simplified .rol command system due to navigation complexity issues:
    - Removed complex button-based navigation that was causing user confusion
    - Implemented simple message reply-based role assignment system
    - Users now use format: "başkan @Başkan" or "futbolcu @Oyuncu" to set roles
    - Supports role mentions (@role), role IDs, and role names for flexibility
    - Added comprehensive role type mapping (başkan/baskan → president, etc.)
    - Enhanced error handling with clear format examples and guidance
    - System now stable and user-friendly without confusing navigation loops
    - Role assignment works via simple text commands with 60-second timeout
- June 23, 2025. Successfully implemented complete modal → channel workflow system:
  - Modal forms now work as the first step in all transfer commands
  - Commands show modal form buttons first, channels created only after form submission
  - Complete workflow: command → modal button → modal form → form submission → channel creation → negotiation
  - All transfer commands (offer, contract, trade, hire, release) fully operational with modal forms
  - Modal forms collect detailed transfer information before creating negotiation channels
  - Negotiation channels display form data with functional accept/reject/edit buttons
  - Enhanced user experience with structured form input followed by dedicated negotiation spaces
  - Fixed all modal import issues and embed data handling for Discord.js v13 compatibility
- June 23, 2025. Completed comprehensive Discord.js v13 migration and channel-based negotiation system:
  - Successfully migrated all commands from modal-based to channel-based negotiation system
  - Fixed all Discord.js v13 compatibility issues: removed Modal, TextInputComponent, showModal references
  - Updated all transfer commands (offer, contract, trade, hire, release) to directly create negotiation channels
  - Implemented proper workflow: command execution → channel creation → embed forms → button interactions
  - Fixed syntax errors in embeds_old.js and variable declaration conflicts across all command files
  - Removed modal submission handlers from index.js and buttonHandler.js
  - All transfer negotiations now happen in dedicated private channels with proper permissions and button controls
  - System now fully compatible with Discord.js v13.17.1 without any v14 remnants
  - Bot ready for deployment pending valid Discord token configuration
- June 23, 2025. Discord.js v13.17.1 migration completed:
    - Downgraded from Discord.js v14.20.0 to v13.17.1 as requested by user
    - Updated all API calls: GatewayIntentBits → Intents.FLAGS, EmbedBuilder → MessageEmbed
    - Converted button components: ButtonBuilder → MessageButton, ActionRowBuilder → MessageActionRow
    - Fixed interaction handlers: isStringSelectMenu() → isSelectMenu()
    - Removed modal API usage (not available in v13) - kept form-based systems
    - Updated embed methods: addFields() → addField(), setFooter() format changes
    - Fixed button styles to use string format: 'SUCCESS', 'DANGER', 'SECONDARY'
    - Completely rebuilt embeds utility with v13-compatible MessageEmbed class
    - All transfer commands now fully compatible with Discord.js v13.17.1
    - Fixed embed field syntax errors: converted object format to parameter format
    - Resolved MessageEmbed field name validation issues in all command files
    - Updated 12 command files with proper addField() method calls
    - Completely rebuilt buttonHandler.js with Discord.js v13 compatible syntax
    - Removed all modal-related code (not supported in v13) and fixed button interactions
    - Fixed handler class instantiation issues and proper module exports
    - Eliminated all deprecation warnings: converted setFooter to object format and addField to addFields
    - Added missing button handlers for show_ prefixed interactions (offer, contract, trade, hire, announcement, release modals)
    - Implemented proper Discord.js v13 modal support with Modal and TextInputComponent classes
    - Updated release modal handler to use real modal forms instead of placeholder messages
    - Modal submission handlers properly integrated with existing negotiation channel system
    - Fixed undefined button style constants (Success, Danger, Secondary) to use proper string format
    - Resolved user lookup issues in modal submission handlers with proper parameter parsing
    - Added debug logging for troubleshooting modal form submissions
    - Bot successfully running without errors or warnings on Discord.js v13.17.1
    - All button interaction errors resolved and transfer system fully operational with working modals

## User Preferences

Preferred communication style: Simple, everyday language.
Modal-based transfer system: All transfer commands now use interactive forms instead of text-based input for better user experience.