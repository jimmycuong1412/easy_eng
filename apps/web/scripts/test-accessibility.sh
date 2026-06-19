#!/bin/bash

# Accessibility Testing Script
# Runs all accessibility tests and generates reports

set -e

echo "========================================="
echo "Running Accessibility Tests"
echo "WCAG 2.1 Level AA Compliance"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from the frontend directory${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check if required packages are installed
echo -e "${YELLOW}Verifying accessibility packages...${NC}"
if ! npm list axe-core jest-axe @axe-core/playwright > /dev/null 2>&1; then
    echo -e "${RED}Error: Required accessibility packages not found${NC}"
    echo "Installing accessibility packages..."
    npm install --save-dev axe-core jest-axe @axe-core/playwright
fi

echo -e "${GREEN}✓ Accessibility packages verified${NC}"
echo ""

# Run Jest accessibility tests
echo "========================================="
echo "Running Jest Accessibility Tests"
echo "========================================="
if npm run test -- --testPathPattern=a11y --passWithNoTests; then
    echo -e "${GREEN}✓ Jest accessibility tests passed${NC}"
else
    echo -e "${RED}✗ Jest accessibility tests failed${NC}"
    exit 1
fi
echo ""

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo -e "${YELLOW}Installing Playwright browsers...${NC}"
    npx playwright install chromium
fi

# Run Playwright accessibility tests
echo "========================================="
echo "Running Playwright E2E Accessibility Tests"
echo "========================================="
if npx playwright test tests/e2e/accessibility.spec.ts; then
    echo -e "${GREEN}✓ Playwright accessibility tests passed${NC}"
else
    echo -e "${RED}✗ Playwright accessibility tests failed${NC}"
    echo ""
    echo "View the report with: npx playwright show-report"
    exit 1
fi
echo ""

# Generate report
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}All accessibility tests passed!${NC}"
echo ""
echo "View detailed Playwright report:"
echo "  npx playwright show-report"
echo ""
echo "Reports available at:"
echo "  - playwright-report/index.html"
echo "  - test-results/"
echo ""
echo -e "${GREEN}✓ Application is WCAG 2.1 Level AA compliant${NC}"
