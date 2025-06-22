module.exports = {
    prefix: '.',
    token: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN',
    colors: {
        primary: '#5865F2',    // Discord blurple
        success: '#57F287',    // Yeşil
        error: '#ED4245',      // Kırmızı
        background: '#2F3136', // Koyu gri
        text: '#FFFFFF',       // Beyaz
        accent: '#FEE75C'      // Sarı
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
        warning: '⚠️'
    },
    api: {
        playerFaceUrl: 'https://thispersondoesnotexist.com/image' // Ücretsiz yüz API'si
    }
};
