#!/bin/bash

echo "Deploying Asset Hub Migration Monitor..."

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Create data directory if it doesn't exist
echo "Ensuring data directory exists..."
mkdir -p ./backend/data

# Remove old database file if it exists
echo "Removing old database file..."
rm -f ./backend/data/sqlite.db

# Build and start containers
echo "Building and starting containers..."
docker-compose up --build -d

echo "Deployment complete!"
echo "The application should be available at http://localhost:8080"
echo "Check logs with: docker-compose logs -f backend" 