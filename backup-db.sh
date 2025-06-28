#!/bin/bash

# Database backup script for EspritHub
# Run this to backup your current data before restarting with the new configuration

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="esprithub"
DB_USER="esprithub_user"

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup
echo "Creating database backup..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/esprithub_backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "Backup created successfully: $BACKUP_DIR/esprithub_backup_$TIMESTAMP.sql"
else
    echo "Backup failed!"
    exit 1
fi

echo "You can restore this backup later using:"
echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_DIR/esprithub_backup_$TIMESTAMP.sql"
