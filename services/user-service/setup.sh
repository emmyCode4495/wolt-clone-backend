#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Wolt Clone - Development Setup     ║"
echo "╔═══════════════════════════════════════╗"
echo -e "${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Start MongoDB
echo -e "\n${BLUE}Starting MongoDB and Mongo Express...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for MongoDB to be ready
echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"
sleep 5

# Check if MongoDB is healthy
if docker ps | grep -q wolt-mongodb; then
  echo -e "${GREEN}✓ MongoDB is running on port 27017${NC}"
  echo -e "${GREEN}✓ Mongo Express is running on http://localhost:8081${NC}"
  echo -e "  ${YELLOW}Login: admin / admin${NC}"
else
  echo -e "${RED}❌ MongoDB failed to start${NC}"
  docker-compose -f docker-compose.dev.yml logs mongodb
  exit 1
fi

# Setup user service
echo -e "\n${BLUE}Setting up User Service...${NC}"

cd services/user-service

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓ .env file created${NC}"
else
  echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo -e "\n${GREEN}╔═══════════════════════════════════════╗"
echo "║           Setup Complete! 🚀         ║"
echo "╚═══════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Start the user service:"
echo -e "     ${YELLOW}cd services/user-service && npm run dev${NC}"
echo -e "\n  2. Access services:"
echo -e "     • User Service: ${YELLOW}http://localhost:3001${NC}"
echo -e "     • Mongo Express: ${YELLOW}http://localhost:8081${NC}"
echo -e "\n  3. Test the API:"
echo -e "     ${YELLOW}curl http://localhost:3001/health${NC}"

echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  • View MongoDB logs: ${YELLOW}docker-compose -f docker-compose.dev.yml logs -f mongodb${NC}"
echo -e "  • Stop MongoDB: ${YELLOW}docker-compose -f docker-compose.dev.yml down${NC}"
echo -e "  • MongoDB shell: ${YELLOW}docker exec -it wolt-mongodb mongosh${NC}"

echo -e "\n${GREEN}Happy coding! 🎉${NC}\n"