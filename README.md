# MongoDB → PostgreSQL Migration Steps

## ✅ Code Changes (Already Done)

All backend code has been updated to use PostgreSQL with Prisma ORM:
- Database connection updated
- All controllers updated
- Socket handler updated
- Middleware updated
- Package.json updated

## 🎯 What You Need to Do

### Step 1: Create PostgreSQL Database on Render

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `hanasu-db`
   - **Database:** `hanasu`
   - **Region:** Choose closest to you
   - **Plan:** Free
4. Click **"Create Database"**
5. **IMPORTANT:** Copy the **External Database URL** (it looks like this):
   ```
   postgresql://hanasu_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/hanasu
   ```

### Step 2: Update Render Backend Environment Variables

1. Go to your backend service on Render
2. Go to **"Environment"** tab
3. **Add/Update these variables:**

   ```
   DATABASE_URL=<paste the PostgreSQL URL from Step 1>
   GOOGLE_CLIENT_ID=920082095758-aeneumjk990lt77fft3uivhn58m9usbn.apps.googleusercontent.com
   JWT_SECRET=xc90-asdf-7890-jkl4-m2nc-8923-xz12-po09-lkj8-gh76-ty54-re32-wq10
   OPENAI_API_KEY=<your key if you have one>
   CLIENT_URL=https://github.com/akshay0524
   NODE_ENV=production
   ```

4. **Delete this variable:**
   ```
   MONGO_URI  ← Remove this, no longer needed
   ```

5. Click **"Save Changes"**

### Step 3: Update Render Build Command

1. In your Render backend service settings
2. Go to **"Settings"** → **"Build & Deploy"**
3. Update **Build Command** to:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
4. **Start Command** should remain:
   ```
   node server.js
   ```
5. Click **"Save Changes"**

### Step 4: Push Code to GitHub

```bash
git add .
git commit -m "Migrate from MongoDB to PostgreSQL"
git push
```

Render will automatically detect the push and redeploy with the new PostgreSQL setup.

### Step 5: Verify Deployment

1. Wait 3-5 minutes for Render to build and deploy
2. Check Render logs for:
   - ✅ "PostgreSQL Connected via Prisma"
   - ✅ "Server running on port..."
3. Test your app:
   - Login with Google
   - Send messages
   - Add friends

## 🔧 Local Development (Optional)

If you want to test locally before deploying:

### 1. Install PostgreSQL
- Download: https://www.postgresql.org/download/windows/
- Install with default settings (port 5432)
- Remember the password you set!

### 2. Create Local Database
```bash
psql -U postgres
CREATE DATABASE hanasu;
\q
```

### 3. Update Local .env
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hanasu"
GOOGLE_CLIENT_ID=920082095758-aeneumjk990lt77fft3uivhn58m9usbn.apps.googleusercontent.com
JWT_SECRET=xc90-asdf-7890-jkl4-m2nc-8923-xz12-po09-lkj8-gh76-ty54-re32-wq10
PORT=5000
```

### 4. Run Migrations
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## 📊 What Changed?

### Database
- **Before:** MongoDB Atlas
- **After:** PostgreSQL on Render

### ORM
- **Before:** Mongoose
- **After:** Prisma

### Key Benefits
- ✅ Better data integrity (foreign keys)
- ✅ Type-safe queries
- ✅ Better performance
- ✅ Easier to scale

## 🆘 Troubleshooting

### "Can't reach database server"
- Check DATABASE_URL is correct in Render environment variables
- Make sure PostgreSQL database is running on Render

### "Prisma Client not generated"
- Make sure build command includes `npx prisma generate`
- Check Render build logs

### "Migration failed"
- Check DATABASE_URL format is correct
- Ensure database exists and is accessible

## 📞 Need Help?

Check Render logs for specific errors:
- Render Dashboard → Your Service → Logs

---

**That's it!** Once you complete Steps 1-4, your app will be running on PostgreSQL! 🎉
