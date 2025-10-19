#!/bin/bash

set -e  # Exit on any error

echo "Starting deployment script..."

# Git pull
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
echo "Pulling and starting Docker services..."
docker compose pull redis postgres
docker compose up -d --build

echo "Deployment complete!"