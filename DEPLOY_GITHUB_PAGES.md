# Deploying to GitHub Pages

Since GitHub Pages only hosts **Static Websites** (HTML/CSS/JS), it cannot run your Node.js backend.
You must use a split deployment strategy:

1.  **Frontend** -> GitHub Pages
2.  **Backend** -> Render (or similar)

---

## Part 1: Deploy Backend (Render)
Your frontend on GitHub Pages needs a live backend to talk to.

1.  Create a **new repository** on GitHub for this project (if not already done).
2.  Push your code to GitHub.
3.  Go to [dashboard.render.com](https://dashboard.render.com).
4.  Click **New +** -> **Web Service**.
5.  Connect your GitHub repository.
6.  **Root Directory**: `server`
7.  **Build Command**: `npm install`
8.  **Start Command**: `node server.js`
9.  **Environment Variables**:
    *   Add all variables from `server/.env` (`MONGO_URI`, `GOOGLE_CLIENT_ID`, etc.)
10. Click **Deploy**.
11. **Copy the URL** Render gives you (e.g., `https://chat-app.onrender.com`).

---

## Part 2: Configure Frontend for GitHub Pages

1.  **Open `client/.env`**:
    *   Change `VITE_API_URL` to your **Render Backend URL** + `/api`.
    *   Change `VITE_SOCKET_URL` to your **Render Backend URL**.
    *   Example:
        ```env
        VITE_API_URL=https://your-app.onrender.com/api
        VITE_SOCKET_URL=https://your-app.onrender.com
        ```

2.  **Open `client/package.json`**:
    *   Add a `homepage` field at the top:
        ```json
        "homepage": "https://<your-github-username>.github.io/hanasu",
        ```
    *   Add these scripts to `scripts`:
        ```json
        "predeploy": "npm run build",
        "deploy": "gh-pages -d dist"
        ```

3.  **Open `client/vite.config.js`**:
    *   Add `base` property:
        ```js
        export default defineConfig({
          base: '/hanasu/', // MUST match your repo name
          plugins: [react()],
        })
        ```

4.  **Deploy**:
    *   Run: `npm run deploy`
    *   Visit your GitHub Pages URL!

---

## Note on Routing
I have already switched your app to use `HashRouter` (`/#/login`), which is fully compatible with GitHub Pages.
