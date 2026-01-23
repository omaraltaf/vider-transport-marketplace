# Database Migrations

This directory contains Prisma migrations for the Vider Transport Marketplace.

## Migration Tracking

Prisma automatically tracks which migrations have been applied to your database in the `_prisma_migrations` table. This ensures migrations are never run twice and provides a complete history of schema changes.

## Creating Migrations

### Development

To create a new migration during development:

```bash
npm run migrate
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate the Prisma Client

### Production

To apply migrations in production:

```bash
npm run migrate:deploy
```

This command:
- Only applies pending migrations
- Does not create new migrations
- Does not require interactive prompts
- Is safe for CI/CD pipelines

## Initial Setup

1. Ensure PostgreSQL is running
2. Update `DATABASE_URL` in your `.env` file
3. Run the initial migration:
   ```bash
   npm run migrate
   ```
4. Seed the database with test data:
   ```bash
   npm run db:seed
   ```

## Migration Files

Each migration is stored in its own directory under `prisma/migrations/` with:
- A timestamp-based name
- A `migration.sql` file containing the SQL commands
- Metadata tracked by Prisma

## Rollback

Prisma does not have built-in rollback functionality. To rollback:

1. Create a new migration that reverses the changes
2. Or restore from a database backup

## Best Practices

1. **Always review generated SQL** before applying migrations
2. **Test migrations** on a staging database first
3. **Backup production** before running migrations
4. **Never edit** applied migration files
5. **Use descriptive names** when creating migrations

## Common Commands

```bash
# Create and apply a new migration
npm run migrate

# Apply pending migrations (production)
npm run migrate:deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Open Prisma Studio to view data
npm run db:studio

# Seed the database
npm run db:seed
```

## Troubleshooting

### Migration conflicts

If you have migration conflicts:
1. Pull latest changes from git
2. Reset your local database: `npx prisma migrate reset`
3. Apply all migrations: `npm run migrate`

### Failed migrations

If a migration fails:
1. Check the error message
2. Fix the schema issue
3. Create a new migration to correct the problem
4. Never edit the failed migration file

### Database out of sync

If your database schema doesn't match Prisma schema:
```bash
npx prisma db push
```

This syncs the database without creating a migration (use only in development).
