# Step-by-Step Setup Guide

This guide will help you get the necessary keys to run your application.

---

## 1. MongoDB Database (Required)
This is where your users and chats will be stored.

1.  **Go to MongoDB Atlas**: Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up (it's free).
2.  **Create a Cluster**:
    *   Click **+ Create**.
    *   Select **M0 Sandbox** (Free Tier).
    *   Select a provider (AWS) and region near you.
    *   Click **Create**.
3.  **Create a Database User**:
    *   Go to **Database Access** (left sidebar).
    *   Click **+ Add New Database User**.
    *   **Username**: `admin` (or whatever you want).
    *   **Password**: Create a password (avoid special characters like `@` or `/` to prevent url errors, or just remember them). **Write it down!**
    *   Click **Add User**.
4.  **Allow Network Access**:
    *   Go to **Network Access** (left sidebar).
    *   Click **+ Add IP Address**.
    *   Select **Allow Access From Anywhere** (0.0.0.0/0). (This is easiest for beginners).
    *   Click **Confirm**.
5.  **Get Configuration String**:
    *   Go to **Database** (left sidebar).
    *   Click **Connect** button on your cluster.
    *   Select **Drivers**.
    *   Select **Node.js**.
    *   **Copy the connection string**. It looks like:
        `mongodb+srv://admin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
    *   **Paste this into your `server/.env` file** as `MONGO_URI`.
    *   **IMPORTANT**: Replace `<db_password>` with the actual password you created in step 3.

---

## 2. Google OAuth ID (Required)
This allows users to log in with their Google accounts.

1.  **Go to Google Cloud Console**: Visit [console.cloud.google.com](https://console.cloud.google.com/).
2.  **Create a Project**:
    *   Click the dropdown at the top left (next to Google Cloud logo).
    *   Click **New Project**.
    *   Name it "Chat App" and click **Create**.
3.  **Configure Consent Screen**:
    *   Search for "OAuth Consent Screen" in the search bar.
    *   Select **External** -> **Create**.
    *   **App Name**: "ChatVerse".
    *   **User Support Email**: Select your email.
    *   **Developer Contact Info**: Your email.
    *   Click **Save and Continue** (skip the rest).
    *   **Test Users**: Click **+ Add Users** and add your own gmail address so you can test logging in.
4.  **Create Keys**:
    *   Go to **Credentials** (left sidebar).
    *   Click **+ Create Credentials** -> **OAuth Client ID**.
    *   **Application Type**: **Web application**.
    *   **Name**: "React Client".
    *   **Authorized JavaScript Origins**: Click **+ Add URI** and paste:
        `http://localhost:5173`
    *   **Authorized Redirect URIs**: Click **+ Add URI** and paste:
        `http://localhost:5173`
    *   Click **Create**.
5.  **Copy the Client ID**:
    *   Copy the string ending in `...apps.googleusercontent.com`.
    *   **Paste this into `server/.env`** as `GOOGLE_CLIENT_ID`.
    *   **Paste this into `client/.env`** as `VITE_GOOGLE_CLIENT_ID`.

---

## 3. OpenAI API Key (Optional)
This powers the AI chatbot.

1.  **Go to OpenAI**: Visit [platform.openai.com](https://platform.openai.com/) and sign up.
2.  **Create Key**:
    *   Sidebar -> **API Keys**.
    *   Click **+ Create new secret key**.
    *   Copy the key (starts with `sk-...`).
3.  **Billing**:
    *   Note: You need to add a small credit (like $5) to your billing settings for the API to work, it is not free.
4.  **Paste Key**:
    *   Paste into `server/.env` as `OPENAI_API_KEY`.

---

## 4. Final Step: JWT Secret
1.  Open `server/.env`.
2.  Find `JWT_SECRET`.
3.  Change the value to any random long sentence. Example:
    `JWT_SECRET=super_secret_code_that_no_one_can_guess_pizza_burger`
