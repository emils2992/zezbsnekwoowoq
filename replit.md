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

## User Preferences

Preferred communication style: Simple, everyday language.
Modal-based transfer system: All transfer commands now use interactive forms instead of text-based input for better user experience.