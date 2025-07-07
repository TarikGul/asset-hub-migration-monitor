# Deployment Guide

## Quick Deployment

Use the provided deployment script for easy setup:

```bash
./deploy.sh
```

This script will:
1. Stop existing containers
2. Remove old database files
3. Create necessary directories
4. Build and start the application

## Manual Deployment

If you prefer to deploy manually:

### 1. Stop Existing Containers
```bash
docker-compose down
```

### 2. Clean Up Database
```bash
rm -f ./backend/data/sqlite.db
mkdir -p ./backend/data
```

### 3. Build and Start
```bash
docker-compose up --build -d
```

## Database Persistence

The database file (`sqlite.db`) is stored in `./backend/data/` and persisted via Docker volume mount. This means:

- ✅ Database persists across container restarts
- ✅ Database persists across container rebuilds
- ❌ Database is NOT removed by `docker-compose down -v` (uses bind mount, not named volume)

## Fresh Database

To get a completely fresh database:

```bash
# Stop containers
docker-compose down

# Remove database file
rm -f ./backend/data/sqlite.db

# Restart containers (database will be recreated)
docker-compose up -d
```

## Troubleshooting

### Database Schema Issues
If you see errors like "no such table", the database schema may not be initialized:

```bash
# Check if database file exists
ls -la ./backend/data/

# If it doesn't exist, restart containers
docker-compose restart backend
```

### Migration Issues
The database migrations run automatically at container startup. If you need to run them manually:

```bash
# Enter the container
docker exec -it asset-hub-migration-monitor-backend-1 sh

# Run migrations
npm run migrate
npm run push
```

## Logs

View application logs:
```bash
docker-compose logs -f backend
```

## Environment Variables

Key environment variables in `docker-compose.yml`:
- `ASSET_HUB_URL`: WebSocket URL for Asset Hub node
- `RELAY_CHAIN_URL`: WebSocket URL for Relay Chain node
- `LOG_LEVEL`: Logging level (info, debug, etc.) 