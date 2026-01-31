#!/bin/sh

# Exit on error
set -e

# Start the application
# Note: npm start now includes 'npx prisma db push'
echo "Starting application with database synchronization..."
npm run start
