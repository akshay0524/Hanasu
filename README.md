# HANASU - Real-Time AI Chat Application

A production-ready real-time chat application with integrated AI assistance. Built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO.

## Features

- **Authentication**: Secure Google OAuth 2.0 login.
- **Real-Time Messaging**: Instant 1-on-1 chat using Socket.IO.
- **Friend System**: Search users by unique ID (#XXXX), send/accept/reject requests.
- **AI Assistant**: Dedicated AI chat mode powered by OpenAI (GPT).
- **Modern UI**: Fully responsive, dark-themed, glassmorphism design using Tailwind CSS.
- **Persistent History**: MongoDB storage for all chats and AI conversations.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Axios.
- **Backend**: Node.js, Express, Socket.IO.
- **Database**: MongoDB Atlas.
- **AI**: OpenAI API.

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas Account
- Google Cloud Console Project (for OAuth)
- OpenAI API Key

### 1. clone the repository
```bash
git clone <repository-url>
cd ai-chat-app
```

### 2. Backend Setup
Navigate to the server directory:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
OPENAI_API_KEY=your_openai_api_key
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the client directory:
```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the frontend:
```bash
npm run dev
```

## Deployment

### Backend (Render)
1. Create a Web Service on Render.
2. Connect your repository.
3. Set Build Command: `npm install`
4. Set Start Command: `node server.js`
5. Add Environment Variables from your `.env`.

### Frontend (Vercel)
1. Import project into Vercel.
2. Select `client` as the root directory.
3. Build Command: `npm run build`.
4. Add Environment Variables:
   - `VITE_API_URL`: Your Render backend URL + `/api`
   - `VITE_SOCKET_URL`: Your Render backend URL
   - `VITE_GOOGLE_CLIENT_ID`: Same as local.

## License
MIT
# Hanasu
