# JWT Secrets - Beginner's Guide

## What are JWT Secrets?

**JWT** stands for **JSON Web Token**. It's a way to securely transmit information between your application and users.

Think of JWT secrets like passwords that your application uses to:
1. **Sign** tokens (like putting a signature on a document)
2. **Verify** tokens (like checking if a signature is authentic)

### Why Do You Need Them?

When a user logs into your Vider marketplace:
1. Your app creates a JWT token (like a temporary ID card)
2. The token is "signed" with your secret (like adding a security hologram)
3. The user's browser stores this token
4. Every time the user makes a request, they send the token
5. Your app verifies the token using the secret (checks the hologram is real)

**Without the secret, anyone could create fake tokens and pretend to be any user!**

## Do You Need to Configure Them Right Now?

### **Short Answer: NO! Not for testing.**

The CI/CD workflows I created already have **default test secrets** built in:
- `JWT_SECRET: test-jwt-secret-key-for-ci`
- `JWT_REFRESH_SECRET: test-jwt-refresh-secret-key-for-ci`

These are **automatically used** when GitHub Actions runs your tests. You don't need to do anything!

### **When DO You Need to Configure Them?**

You'll need to add your own secrets when:
1. **Deploying to production** (your live website)
2. **Running the app locally** (on your computer)
3. **Wanting extra security** (optional, but recommended)

## How to Generate JWT Secrets

JWT secrets should be long, random strings. Here are several ways to generate them:

### Method 1: Using Node.js (Easiest if you have Node installed)

Open your terminal and run:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

This will output something like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

Run it **twice** to get two different secrets (one for JWT_SECRET, one for JWT_REFRESH_SECRET).

### Method 2: Using OpenSSL (Available on Mac/Linux)

```bash
openssl rand -hex 64
```

Run it twice to get two secrets.

### Method 3: Using an Online Generator

Visit: https://www.random.org/strings/

Settings:
- Number of strings: 2
- Length: 64
- Characters: Alphanumeric (a-z, A-Z, 0-9)
- Click "Get Strings"

**⚠️ Important:** Only use online generators for development/testing, not for production secrets!

### Method 4: Using Python (If you have Python installed)

```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

Run it twice to get two secrets.

## Where to Store JWT Secrets

### For Local Development (Your Computer)

1. **Create a `.env` file** in your project root (if it doesn't exist)
2. **Add your secrets:**

```env
JWT_SECRET=your-first-generated-secret-here
JWT_REFRESH_SECRET=your-second-generated-secret-here
```

3. **Never commit this file to Git!** (It's already in `.gitignore`, so you're safe)

### For GitHub Actions (CI/CD Testing)

**You don't need to do anything!** The workflows use default test secrets automatically.

**Optional:** If you want to use custom secrets for testing:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - Name: `JWT_SECRET`
   - Value: (paste your first generated secret)
5. Click **Add secret**
6. Repeat for `JWT_REFRESH_SECRET`

### For Production Deployment

When you deploy your app to a server:

1. **Never hardcode secrets in your code**
2. **Use environment variables** on your server
3. **Different secrets for production** (never reuse development secrets)

## Example: Complete Setup

Let's say you generated these secrets:

```
Secret 1: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
Secret 2: z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4
```

### Local `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vider_dev

# JWT Secrets
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_REFRESH_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4

# Other settings
NODE_ENV=development
PORT=3000
```

### GitHub Secrets (Optional):

Go to GitHub → Settings → Secrets → Actions:

```
Name: JWT_SECRET
Value: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

Name: JWT_REFRESH_SECRET
Value: z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4
```

## Security Best Practices

### ✅ DO:
- Use long, random secrets (at least 32 characters, preferably 64+)
- Use different secrets for development and production
- Store secrets in environment variables
- Keep secrets private (never share them)
- Rotate secrets periodically (change them every few months)

### ❌ DON'T:
- Use simple passwords like "password123"
- Commit secrets to Git
- Share secrets in chat, email, or screenshots
- Reuse the same secret across multiple projects
- Use the same secret for JWT_SECRET and JWT_REFRESH_SECRET

## Quick Start for Beginners

### Step 1: Generate Secrets

Run this command **twice** in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy both outputs.

### Step 2: Create `.env` File

Create a file named `.env` in your project root:

```env
JWT_SECRET=paste-first-secret-here
JWT_REFRESH_SECRET=paste-second-secret-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vider_dev
```

### Step 3: You're Done!

That's it! Your app will now use these secrets when running locally.

## Testing Your Setup

To verify your secrets are working:

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Check the logs** - you should NOT see any errors about missing JWT secrets

3. **Try logging in** - if authentication works, your secrets are configured correctly!

## Troubleshooting

### Error: "JWT_SECRET is not defined"

**Solution:** Make sure your `.env` file exists and contains `JWT_SECRET=...`

### Error: "Invalid token"

**Solution:** You might have changed your JWT_SECRET. Clear your browser cookies and log in again.

### GitHub Actions failing with JWT errors

**Solution:** The workflows have default secrets. If you added custom secrets to GitHub, make sure they're named exactly `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## FAQ

**Q: Can I use the same secret for both JWT_SECRET and JWT_REFRESH_SECRET?**  
A: Technically yes, but it's not recommended. Use different secrets for better security.

**Q: How long should my secrets be?**  
A: At least 32 characters. The examples above use 64 characters, which is excellent.

**Q: Do I need to add these to GitHub right now?**  
A: No! The CI/CD workflows have default test secrets. You only need to add them if you want custom secrets or when deploying to production.

**Q: What if someone sees my JWT secret?**  
A: Generate new secrets immediately and update them everywhere. Anyone with your secret can create fake authentication tokens.

**Q: Can I change my secrets later?**  
A: Yes! Just generate new ones and update your `.env` file. Note that this will log out all users.

## Summary for Complete Beginners

1. **JWT secrets are like passwords for your app's authentication system**
2. **You DON'T need to configure them for GitHub Actions** (defaults are provided)
3. **You DO need them for local development** (create a `.env` file)
4. **Generate them using:** `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
5. **Keep them secret!** Never commit to Git or share publicly

## Next Steps

- ✅ Generate your secrets (if running locally)
- ✅ Create `.env` file with secrets
- ✅ Push your code to GitHub (secrets are NOT needed for this)
- ⏳ Configure production secrets when deploying

Need more help? Check out:
- `.env.example` - Shows what environment variables you need
- `src/config/env.ts` - Shows how the app loads secrets
- `GITHUB_SETUP.md` - Complete GitHub setup guide

---

**You're doing great! 🎉 Don't worry if this seems complex - it gets easier with practice!**
