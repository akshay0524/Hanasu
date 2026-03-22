require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./config/db');
const socketHandler = require('./sockets/socketHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Connect to PostgreSQL
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: '*', // Allow all for now, in production set to client URL
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);

// Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for now
        methods: ['GET', 'POST'],
    },
});

socketHandler(io);

// Root Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
