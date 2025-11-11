#!/bin/bash

# Orders API Python - Development Setup Script
# This script sets up the Python Orders API for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐍 Orders API Python - Development Setup${NC}"
echo "=============================================="
echo ""

# Check if Python 3.11+ is installed
echo -e "${YELLOW}Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"
else
    echo -e "${RED}❌ Python 3.11+ is required but not found${NC}"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${BLUE}📝 Please edit .env file with your configuration${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
if pytest tests/ -v; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo "Please check the test output above"
fi

# Code formatting
echo -e "${YELLOW}Formatting code...${NC}"
black app/ tests/ --line-length 88
isort app/ tests/ --profile black

# Linting
echo -e "${YELLOW}Running linters...${NC}"
flake8 app/ tests/ --max-line-length 88 --extend-ignore E203,W503
mypy app/ --ignore-missing-imports

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Edit .env file with your configuration"
echo "2. Start the API: uvicorn main:app --reload"
echo "3. Access docs: http://localhost:8080/docs"
echo "4. Run tests: pytest tests/ -v"
echo ""
echo -e "${BLUE}🚀 To start the API:${NC}"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --host 0.0.0.0 --port 8080 --reload"
echo ""
echo -e "${BLUE}🔧 To run tests:${NC}"
echo "   source venv/bin/activate"
echo "   pytest tests/ -v"
echo ""
echo -e "${BLUE}📊 To run with Docker:${NC}"
echo "   docker build -t orders-api-python ."
echo "   docker run -p 8080:8080 orders-api-python"
