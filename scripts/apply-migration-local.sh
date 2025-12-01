#!/bin/bash

# Apply migration to local database
echo "Applying driver rates migration to local database..."

# Use the DATABASE_URL from .env
source .env

# Apply using psql through docker if needed, or direct connection
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f scripts/add-columns-simple.sql
else
    echo "psql not found. Trying with docker..."
    docker exec -i $(docker ps -q -f name=postgres) psql -U omaraltaf -d vider_dev < scripts/add-columns-simple.sql
fi

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
else
    echo "❌ Migration failed. Try running manually:"
    echo "psql \$DATABASE_URL -f scripts/add-columns-simple.sql"
fi
