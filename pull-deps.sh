#!/bin/bash

set -e  # Exit on any error

# Check for -pull flag
PULL_IMAGES=false
if [[ "$*" == *"-pull"* ]]; then
    PULL_IMAGES=true
fi

echo "Pulling latest changes from git..."
git pull

# Root npm install
echo "Installing root dependencies..."
npm install

# Frontend npm install
echo "Installing frontend dependencies..."
cd frontend/waifu-vault
npm install
cd ../..

# Docker compose operations
if [ "$PULL_IMAGES" = true ]; then
    echo "Pulling Docker images..."
    docker compose pull redis postgres
fi

echo "Starting Docker services..."
docker compose up -d --build

echo "Deployment complete!"
