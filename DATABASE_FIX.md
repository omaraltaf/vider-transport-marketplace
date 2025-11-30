# Quick Database Fix Guide

## The Problem

PostgreSQL on your Mac needs proper authentication. Let's fix it step by step.

## Solution: Set Up PostgreSQL Without Password

### Step 1: Connect to PostgreSQL

Open your terminal and run:

```bash
psql postgres
```

This should connect you without asking for a password.

### Step 2: Set a Simple Password for Your User

Once you're in the `psql` prompt (you'll see `postgres=#`), run:

```sql
ALTER USER omaraltaf WITH PASSWORD 'password';
```

### Step 3: Exit psql

```sql
\q
```

### Step 4: Update Your .env File

Open the `.env` file and change the DATABASE_URL line to:

```env
DATABASE_URL=postgresql://omaraltaf:password@localhost:5432/vider_dev
```

### Step 5: Restart the App

```bash
npm run dev
```

## Alternative: Use Trust Authentication (Easier)

If the above doesn't work, let's configure PostgreSQL to trust local connections:

### Step 1: Find Your PostgreSQL Config

```bash
psql postgres -c "SHOW hba_file;"
```

This will show you the path to `pg_hba.conf` (something like `/opt/homebrew/var/postgresql@15/pg_hba.conf`)

### Step 2: Edit the Config

```bash
# Replace the path with what you got from Step 1
nano /opt/homebrew/var/postgresql@15/pg_hba.conf
```

### Step 3: Change Authentication Method

Find lines that look like this:

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

Change `scram-sha-256` to `trust`:

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
```

Also change this line:

```
local   all             all                                     peer
```

To:

```
local   all             all                                     trust
```

### Step 4: Save and Exit

Press `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Restart PostgreSQL

```bash
brew services restart postgresql@15
```

### Step 6: Update .env

Change your DATABASE_URL to:

```env
DATABASE_URL=postgresql://omaraltaf@localhost:5432/vider_dev
```

### Step 7: Try Again

```bash
npm run dev
```

## Quick Test

To test if your database connection works:

```bash
psql -d vider_dev
```

If this connects without asking for a password, your setup is correct!

Then just run:

```bash
npm run dev
```

## Still Having Issues?

Try this simpler connection string in your `.env`:

```env
DATABASE_URL=postgresql:///vider_dev
```

This uses Unix socket connection which often works without passwords on Mac.

---

**Once you get it working, the app should start successfully!** 🎉
