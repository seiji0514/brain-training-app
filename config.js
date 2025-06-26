const config = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    database: {
        path: process.env.DB_PATH || './database.sqlite'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
        expiration: process.env.JWT_EXPIRATION || '30m'
    },
    session: {
        secret: process.env.SESSION_SECRET || 'another-super-secret-key-change-this-in-production',
        expiration: process.env.SESSION_EXPIRATION || '24h',
        name: 'sessionId',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24時間
        }
    },
    security: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500').split(','),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        loginTimeout: process.env.LOGIN_TIMEOUT || '15m'
    }
};

module.exports = config;