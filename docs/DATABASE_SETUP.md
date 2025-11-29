# Database Setup Guide

This guide will help you set up the PostgreSQL database for the Vider Transport Marketplace.

## Prerequisites

- PostgreSQL 15 or higher installed and running
- Node.js v20 or higher
- npm or yarn

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/setup-db.sh
```

This script will:
1. Check your database connection
2. Run all migrations
3. Seed the database with test data

### Option 2: Manual Setup

1. **Create a PostgreSQL database:**

```sql
CREATE DATABASE vider_dev;
```

2. **Update your `.env` file:**

```env
DATABASE_URL=postgresql://username:password@localhost:5432/vider_dev
```

3. **Run migrations:**

```bash
npm run migrate
```

4. **Seed the database:**

```bash
npm run db:seed
```

## Database Schema

The database includes the following main tables:

- **User**: User accounts with role-based access
- **Company**: Transport companies registered on the platform
- **VehicleListing**: Available vehicles for rent
- **DriverListing**: Available drivers for hire
- **Booking**: Rental transactions and their lifecycle
- **Rating**: Reviews and ratings for companies and drivers
- **Message** / **MessageThread**: In-app messaging system
- **Transaction**: Financial transaction records
- **AuditLog**: Administrative action tracking
- **PlatformConfig**: Global platform configuration

## Test Data

After seeding, you'll have access to:

### Test Accounts

| Email | Password | Role | Company |
|-------|----------|------|---------|
| admin@vider.no | password123 | Platform Admin | Oslo Transport AS |
| admin@oslotransport.no | password123 | Company Admin | Oslo Transport AS |
| admin@bergenlogistics.no | password123 | Company Admin | Bergen Logistics |
| user@trondheimfleet.no | password123 | Company User | Trondheim Fleet Services |

### Sample Data

- **3 Companies**: Oslo Transport AS, Bergen Logistics, Trondheim Fleet Services
- **4 Vehicle Listings**: Various trucks and vans across Norway
- **3 Driver Listings**: Professional drivers with different certifications
- **3 Bookings**: In different states (Completed, Active, Pending)
- **1 Rating**: Sample review for a completed booking
- **Message Thread**: Sample conversation between companies

## Migration Management

### Creating New Migrations

When you modify the Prisma schema:

```bash
npm run migrate
```

This creates a new migration and applies it to your database.

### Viewing Migration Status

```bash
npx prisma migrate status
```

### Resetting the Database

⚠️ **Warning**: This will delete all data!

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run the seed script

## Prisma Studio

To view and edit data in a GUI:

```bash
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555`

## Production Deployment

For production environments:

1. **Set production DATABASE_URL** in your environment
2. **Run migrations** (non-interactive):
   ```bash
   npm run migrate:deploy
   ```
3. **Do NOT run the seed script** in production

## Troubleshooting

### Connection Refused

If you get "connection refused" errors:

1. Check PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify your DATABASE_URL is correct
3. Check PostgreSQL is listening on the correct port (default: 5432)

### Authentication Failed

If you get authentication errors:

1. Verify your username and password in DATABASE_URL
2. Check PostgreSQL user permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE vider_dev TO your_username;
   ```

### Migration Conflicts

If you have migration conflicts after pulling changes:

```bash
npx prisma migrate reset
npm run migrate
```

### Schema Out of Sync

If your database schema doesn't match the Prisma schema:

```bash
# Development only - syncs without creating migration
npx prisma db push
```

## Database Backup

### Creating a Backup

```bash
pg_dump -U username -d vider_dev > backup.sql
```

### Restoring from Backup

```bash
psql -U username -d vider_dev < backup.sql
```

## Environment-Specific Databases

It's recommended to use separate databases for different environments:

- **Development**: `vider_dev`
- **Testing**: `vider_test`
- **Staging**: `vider_staging`
- **Production**: `vider_prod`

Update your DATABASE_URL accordingly in each environment.

## Security Best Practices

1. **Never commit** `.env` files to version control
2. **Use strong passwords** for database users
3. **Limit database user permissions** to only what's needed
4. **Enable SSL** for database connections in production
5. **Regular backups** of production data
6. **Rotate credentials** periodically

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
