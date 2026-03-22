const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Connection pool size for handling concurrent requests
            maxPoolSize: 10,
            // Close sockets after 45 seconds of inactivity
            socketTimeoutMS: 45000,
            // Timeout for initial connection
            serverSelectionTimeoutMS: 5000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // ─── Connection Event Handlers ─────────────────────────────────────
        mongoose.connection.on('error', (err) => {
            console.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected successfully');
        });

    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = { prisma, connectDB };
