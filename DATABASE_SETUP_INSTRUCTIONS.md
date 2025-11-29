# PostgreSQL Setup Instructions for Vider

You have PostgreSQL 15 installed, but we need to set up the database credentials. Here's how:

## Option 1: Use pgAdmin (Easiest)

1. **Open pgAdmin 4**:
   ```bash
   open "/Applications/PostgreSQL 15/pgAdmin 4.app"
   ```

2. **Connect to your PostgreSQL server** (you'll need the password you set during installation)

3. **Create the database**:
   - Right-click on "Databases" → "Create" → "Database"
   - Name: `vider_dev`
   - Owner: `postgres`
   - Click "Save"

4. **Note your password** and update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/vider_dev
   ```

## Option 2: Use SQL Shell (Command Line)

1. **Open SQL Shell**:
   ```bash
   open "/Applications/PostgreSQL 15/SQL Shell (psql).app"
   ```

2. **Press Enter** for all prompts except password (use defaults)

3. **Enter your postgres password** when prompted

4. **Create the database**:
   ```sql
   CREATE DATABASE vider_dev;
   ```

5. **Exit**:
   ```sql
   \q
   ```

6. **Update `.env`** with your password:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/vider_dev
   ```

## Option 3: Reset PostgreSQL Password (If you forgot it)

If you don't remember your PostgreSQL password:

1. **Find pg_hba.conf**:
   ```bash
   ls /Library/PostgreSQL/15/data/pg_hba.conf
   ```

2. **Edit it** (requires sudo):
   ```bash
   sudo nano /Library/PostgreSQL/15/data/pg_hba.conf
   ```

3. **Change this line**:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
   **To**:
   ```
   host    all             all             127.0.0.1/32            trust
   ```

4. **Restart PostgreSQL**:
   ```bash
   sudo /Library/PostgreSQL/15/bin/pg_ctl restart -D /Library/PostgreSQL/15/data
   ```

5. **Connect without password**:
   ```bash
   /Library/PostgreSQL/15/bin/psql -U postgres -h localhost
   ```

6. **Set new password**:
   ```sql
   ALTER USER postgres WITH PASSWORD 'newpassword123';
   ```

7. **Change pg_hba.conf back** to `scram-sha-256` and restart PostgreSQL

8. **Update `.env`**:
   ```env
   DATABASE_URL=postgresql://postgres:newpassword123@localhost:5432/vider_dev
   ```

## After Database is Created

Once you have the database set up and `.env` updated:

1. **Run migrations**:
   ```bash
   npm run migrate
   ```

2. **Run the tests**:
   ```bash
   npm test src/services/company.service.test.ts
   ```

The property-based tests will run 100 iterations each and validate:
- Property 5: Profile update persistence
- Property 6: Verification badge display

## Quick Test

To verify your connection works:

```bash
PGPASSWORD=your_password /Library/PostgreSQL/15/bin/psql -U postgres -h localhost -c "SELECT version();"
```

If this works, you're all set!

## Need Help?

If you're still stuck, the easiest way is:
1. Open pgAdmin 4 from Applications
2. Use the password you set during PostgreSQL installation
3. Create the `vider_dev` database through the GUI
4. Update the `.env` file with that password
