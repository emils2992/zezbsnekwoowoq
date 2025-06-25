module.exports = {
    prefix: '.',
    token: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN',
    colors: {
        primary: '#5865F2',    // Discord blurple
        success: '#57F287',    // Yeşil
        error: '#ED4245',      // Kırmızı
        warning: '#FEE75C',    // Sarı
        background: '#2F3136', // Koyu gri
        text: '#FFFFFF',       // Beyaz
        accent: '#EB459E'      // Pembe
    },
    emojis: {
        football: '⚽',
        handshake: '🤝',
        money: '💰',
        contract: '📝',
        transfer: '🔄',
        release: '🚪',
        check: '✅',
        cross: '❌',
        edit: '✏️',
        warning: '⚠️',
        help: '❓',
        offer: '💰',
        hire: '🏠',
        trade: '🔄',
        trelease: '🚫',
        settings: '⚙️',
        announcement: '📢'
    },
    api: {
        playerFaceUrl: 'https://thispersondoesnotexist.com/image' // Ücretsiz yüz API'si
    }
};
