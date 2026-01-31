#!/bin/sh

# Exit on error
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma db push --accept-data-loss

# Start the application
echo "Starting application..."
npm run start
