#!/bin/bash

# Node.js Installation Script for macOS
# Run this in your terminal: bash INSTALL_NODEJS.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Node.js Installation for Jotto Game               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Step 1: Check if Homebrew is installed
echo "Step 1: Checking for Homebrew..."
if command -v brew &> /dev/null; then
    echo "✓ Homebrew is already installed!"
    BREW_VERSION=$(brew --version | head -n 1)
    echo "  $BREW_VERSION"
else
    echo "✗ Homebrew is not installed."
    echo
    echo "Installing Homebrew..."
    echo "You will be prompted for your password."
    echo
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    echo
    echo "Adding Homebrew to your PATH..."

    # Detect if Apple Silicon or Intel
    if [[ $(uname -m) == 'arm64' ]]; then
        echo "Detected Apple Silicon Mac (M1/M2/M3)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo "Detected Intel Mac"
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi

    echo "✓ Homebrew installed successfully!"
fi

echo
echo "─────────────────────────────────────────────────────────────"
echo

# Step 2: Install Node.js
echo "Step 2: Installing Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js is already installed: $NODE_VERSION"

    # Check if version is sufficient
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo "⚠ Warning: Node.js version is less than 18. Upgrading..."
        brew upgrade node
    else
        echo "✓ Node.js version is sufficient (18+)"
    fi
else
    echo "Installing Node.js via Homebrew..."
    brew install node
    echo "✓ Node.js installed successfully!"
fi

echo
echo "─────────────────────────────────────────────────────────────"
echo

# Step 3: Verify installation
echo "Step 3: Verifying installation..."
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

echo "✓ Node.js version: $NODE_VERSION"
echo "✓ npm version: $NPM_VERSION"

echo
echo "─────────────────────────────────────────────────────────────"
echo

# Step 4: Install project dependencies
echo "Step 4: Installing Jotto game dependencies..."
echo "This may take a few minutes..."
echo

if [ -f "package.json" ]; then
    npm install
    echo
    echo "✓ Dependencies installed successfully!"
else
    echo "⚠ Warning: package.json not found. Make sure you're in the jottogame directory."
    exit 1
fi

echo
echo "─────────────────────────────────────────────────────────────"
echo

# Step 5: Run tests
echo "Step 5: Running backend tests..."
cd backend
npm test
cd ..

echo
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 Installation Complete! ✓                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "Next steps:"
echo "1. Deploy to AWS: cd infrastructure && npm run deploy"
echo "2. Run frontend locally: cd frontend && npm run dev"
echo "3. Read DEPLOYMENT.md for full deployment guide"
echo
