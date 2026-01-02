#!/bin/bash

# Deployment Script for Digital Ocean
# This script builds and deploys the Bingo 24 Kilates application

set -e  # Exit on error

echo "🚀 Starting Bingo 24 Kilates Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Frontend (Player)
echo -e "${YELLOW}📦 Building Client Player (PWA)...${NC}"
cd client-player
npm install
npm run build
cd ..
echo -e "${GREEN}✅ Client Player built successfully${NC}"

# Step 2: Build Frontend (Admin)
echo -e "${YELLOW}📦 Building Client Admin...${NC}"
cd client-admin
npm install
npm run build
cd ..
echo -e "${GREEN}✅ Client Admin built successfully${NC}"

# Step 3: Install Backend Dependencies
echo -e "${YELLOW}📦 Installing Backend Dependencies...${NC}"
cd server
npm install --production
cd ..
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Step 4: Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p server/logs
mkdir -p certbot/conf
mkdir -p certbot/www
echo -e "${GREEN}✅ Directories created${NC}"

# Step 5: Check environment variables
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file from .env.production.template"
    exit 1
fi
echo -e "${GREEN}✅ Environment variables configured${NC}"

# Step 6: Start with Docker Compose
echo -e "${YELLOW}🐳 Starting Docker containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build
echo -e "${GREEN}✅ Docker containers started${NC}"

# Step 7: Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Step 8: Check service health
echo -e "${YELLOW}🏥 Checking service health...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Service URLs:"
echo "  - Player App: http://localhost (or your domain)"
echo "  - Admin Panel: http://localhost/admin"
echo "  - API: http://localhost/api"
echo ""
echo "📝 Next steps:"
echo "  1. Configure SSL with: sudo certbot --nginx -d yourdomain.com"
echo "  2. Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
echo "  3. Check PM2 status: docker exec bingo24k-backend-prod pm2 status"
