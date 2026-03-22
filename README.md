# Hanasu 話す

A real-time chat app where you can message friends, manage friend requests, and even talk to an AI assistant — all in one place.

Built with the MERN stack + Socket.IO.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socketdotio&logoColor=white)

---

## What it does

- **Google login** — sign in with your Google account, no passwords to remember
- **Real-time chat** — messages show up instantly via WebSockets
- **Friend system** — search users by their unique tag (`#A1F3`), send/accept/reject requests
- **AI chat** — built-in AI assistant powered by OpenAI (when API key is configured)
- **Online indicators** — see who's online right now
- **Typing indicators** — know when someone is typing
- **Desktop notifications** — get notified even when the tab is in the background
- **Dark themed UI** — glassmorphism-inspired design with a Japanese aesthetic

## Tech stack

**Frontend:** React + Vite, Tailwind CSS, Framer Motion, Axios

**Backend:** Node.js, Express, Socket.IO, Mongoose

**Database:** MongoDB Atlas

**Auth:** Google OAuth 2.0 + JWT

**AI:** OpenAI API (GPT-3.5)

## Project structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Chat windows, sidebar, AI chat
│   │   ├── context/        # Auth, socket, theme providers
│   │   ├── pages/          # Login, chat home
│   │   └── services/       # API calls (axios)
│   └── ...
│
├── server/                 # Express backend
│   ├── config/             # MongoDB connection
│   ├── controllers/        # Auth, chat, friends, AI, user
│   ├── middleware/          # JWT auth middleware
│   ├── models/             # Mongoose schemas (User, Message, FriendRequest, AIChat, Conversation)
│   ├── routes/             # API route definitions
│   ├── sockets/            # Socket.IO event handlers
│   ├── utils/              # Token generation
│   └── server.js           # Entry point
│
└── README.md
```

## Getting started

### Prerequisites

- Node.js v16+
- A MongoDB Atlas cluster (free tier works fine)
- Google Cloud project with OAuth 2.0 credentials
- OpenAI API key (optional — AI chat shows a fallback message without it)

### Backend

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=pick_something_long_and_random
GOOGLE_CLIENT_ID=your_google_oauth_client_id
OPENAI_API_KEY=your_openai_key_or_leave_empty
CLIENT_URL=http://localhost:5173
```

Start the server:

```bash
npm run dev
```

### Frontend

```bash
cd client
npm install
```

Create `client/.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173` and sign in with Google.

## Deploying

**Backend → Render**
1. Create a new Web Service, connect this repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add your env vars from above

**Frontend → Vercel / GitHub Pages**
1. Root directory: `client`
2. Build command: `npm run build`
3. Add env vars (point `VITE_API_URL` and `VITE_SOCKET_URL` to your Render URL)

## Database models

The app uses 5 Mongoose models:

| Model | Purpose |
|-------|---------|
| `User` | Profile info, Google ID, unique tag, friends list |
| `Message` | Chat messages between users (sender, receiver, content, read status) |
| `FriendRequest` | Tracks pending/accepted/rejected requests |
| `Conversation` | Links two users, tracks last message for sidebar ordering |
| `AIChat` | Per-user AI conversation history |

All models have proper indexes for the queries they support. Messages have compound indexes on `(sender, receiver, createdAt)` for fast chat history lookups.

## API endpoints

| Method | Route | What it does |
|--------|-------|-------------|
| `POST` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/users/search/:userTag` | Find a user by tag |
| `POST` | `/api/friends/request` | Send friend request |
| `POST` | `/api/friends/accept` | Accept request |
| `POST` | `/api/friends/reject` | Reject request |
| `GET` | `/api/friends/list` | Get friends list |
| `GET` | `/api/friends/requests` | Get pending requests |
| `POST` | `/api/friends/remove` | Remove a friend |
| `GET` | `/api/chat/:friendId` | Get chat history |
| `PUT` | `/api/chat/:friendId/read` | Mark messages as read |
| `GET` | `/api/chat/unread/counts` | Get unread counts |
| `POST` | `/api/ai/chat` | Send message to AI |
| `GET` | `/api/ai/history` | Get AI chat history |

## License

MIT
