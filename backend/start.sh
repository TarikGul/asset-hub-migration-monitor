#!/bin/sh
set -e

echo "Initializing database..."
yarn migrate
yarn push

echo "Starting application..."
yarn start 