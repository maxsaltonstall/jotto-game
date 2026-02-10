# Installation Guide - Node.js Setup for Jotto Game

This guide helps you install Node.js and npm, which are required to develop and deploy the Jotto game.

## Prerequisites Check

Before installing, let's check what you have:

```bash
# Check if Node.js is installed
node --version

# Check if npm is installed
npm --version

# Check if Homebrew is installed (macOS)
brew --version
```

If these commands return version numbers, you're already set! Skip to the [Project Setup](#project-setup) section.

## System Requirements

- **Operating System**: macOS (Darwin)
- **Node.js Version**: 18.x or higher (LTS recommended)
- **Disk Space**: ~500MB for Node.js + project dependencies

## Installation Options

Choose the method that works best for you:

### Option 1: Homebrew (Recommended for macOS) ⭐

Homebrew is the easiest way to install and manage Node.js on macOS.

#### Step 1: Install Homebrew

If you don't have Homebrew installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. You may need to enter your password.

After installation, you might need to add Homebrew to your PATH (the installer will tell you):

```bash
# For Apple Silicon Macs (M1, M2, M3):
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# For Intel Macs:
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

#### Step 2: Install Node.js

```bash
brew install node
```

#### Step 3: Verify Installation

```bash
node --version   # Should show v20.x.x or higher
npm --version    # Should show 10.x.x or higher
```

#### Benefits
- ✅ Easy to install
- ✅ Easy to update (`brew upgrade node`)
- ✅ Manages dependencies automatically
- ✅ Can install multiple versions

---

### Option 2: Official Installer

Download directly from the Node.js website.

#### Step 1: Download

Visit https://nodejs.org/ and download:
- **LTS (Long Term Support)** - Recommended for most users
- Currently: Node.js 20.x LTS

Choose the macOS installer (.pkg file).

#### Step 2: Install

1. Open the downloaded `.pkg` file
2. Follow the installation wizard
3. Accept the license agreement
4. Choose installation location (default is fine)
5. Complete the installation

#### Step 3: Verify Installation

Open a new terminal window and run:

```bash
node --version
npm --version
```

#### Benefits
- ✅ Simple, guided installation
- ✅ No additional tools needed
- ✅ Official source

---

### Option 3: NVM (Node Version Manager)

NVM lets you install and switch between multiple Node.js versions.

#### Step 1: Install NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

#### Step 2: Load NVM

Close and reopen your terminal, or run:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Add this to your shell profile to load NVM automatically:

```bash
# For zsh (default on macOS):
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc

# For bash:
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bash_profile
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bash_profile
```

#### Step 3: Install Node.js

```bash
# Install latest LTS version
nvm install --lts

# Use the LTS version
nvm use --lts

# Set as default
nvm alias default node
```

#### Step 4: Verify Installation

```bash
node --version
npm --version
```

#### Benefits
- ✅ Multiple Node.js versions
- ✅ Easy version switching
- ✅ Project-specific versions
- ✅ Great for developers

---

## Project Setup

Once Node.js is installed, set up the Jotto game project:

### 1. Navigate to Project Directory

```bash
cd /Users/max.saltonstall/jottogame
```

### 2. Install Project Dependencies

```bash
npm install
```

This will install dependencies for all three workspaces:
- `backend/` - Lambda functions and game logic
- `frontend/` - React web application
- `infrastructure/` - AWS CDK stack

Expected output:
```
added XXX packages in YYs
```

### 3. Verify Installation

Check that dependencies were installed:

```bash
ls backend/node_modules
ls frontend/node_modules
ls infrastructure/node_modules
```

### 4. Run Tests

Verify everything works:

```bash
cd backend
npm test
```

Expected output:
```
✓ countCommonLetters (8 tests)
✓ isValidWord (5 tests)
✓ normalizeWord (3 tests)

Test Files  1 passed (1)
Tests  16 passed (16)
```

## Troubleshooting

### "command not found: npm" after installation

**Solution**: Close and reopen your terminal to reload the PATH.

### "Permission denied" errors

**Solution**: Don't use `sudo npm install`. If you see permission errors:

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### npm install is very slow

**Solution**: This is normal for the first install. It's downloading ~1000+ packages.

Use a faster mirror:
```bash
npm config set registry https://registry.npmjs.org/
```

### "EACCES" permission errors

**Solution**: Fix npm permissions:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zprofile
source ~/.zprofile
```

### Outdated Node.js version

Check your version:
```bash
node --version
```

If it's less than v18.0.0, update:

**With Homebrew:**
```bash
brew upgrade node
```

**With NVM:**
```bash
nvm install --lts
nvm use --lts
```

**With Official Installer:**
Download the latest LTS from https://nodejs.org/

## Version Compatibility

The Jotto game has been tested with:

| Tool | Minimum Version | Recommended Version |
|------|----------------|---------------------|
| Node.js | 18.0.0 | 20.x LTS |
| npm | 9.0.0 | 10.x |
| TypeScript | 5.0.0 | 5.3.x |

## Additional Tools (Optional)

### Yarn (Alternative to npm)

```bash
npm install -g yarn
```

Then use `yarn` instead of `npm install`.

### pnpm (Faster Alternative)

```bash
npm install -g pnpm
```

Then use `pnpm install` instead of `npm install`.

## Next Steps

After successful installation:

1. ✅ Node.js installed and verified
2. ✅ Project dependencies installed
3. ✅ Tests passing

Now you can:

- **Deploy to AWS**: Follow [DEPLOYMENT.md](DEPLOYMENT.md)
- **Local Development**: Follow [QUICK_START.md](QUICK_START.md)
- **Explore Code**: See [INDEX.md](INDEX.md) for file navigation

## Quick Reference Commands

```bash
# Check versions
node --version
npm --version

# Install dependencies
npm install

# Update dependencies
npm update

# Clean install (removes node_modules first)
rm -rf node_modules package-lock.json
npm install

# Run backend tests
cd backend && npm test

# Build backend
cd backend && npm run build

# Run frontend dev server
cd frontend && npm run dev

# Deploy infrastructure
cd infrastructure && npm run deploy
```

## Getting Help

If you encounter issues:

1. **Check versions**: Ensure Node.js 18+ and npm 9+
2. **Clear cache**: `npm cache clean --force`
3. **Reinstall**: Remove `node_modules/` and run `npm install` again
4. **Check logs**: npm shows detailed error logs
5. **Search errors**: Copy error messages to Google/Stack Overflow

## Platform-Specific Notes

### macOS (Your System)
- Shell: zsh (default)
- Config file: `~/.zshrc`
- Homebrew recommended
- Apple Silicon (M1/M2/M3) fully supported

### Intel vs Apple Silicon
Both architectures are supported. Node.js has native ARM64 builds for Apple Silicon.

---

**Ready to continue?**

Once Node.js is installed, return to the terminal and run:
```bash
cd /Users/max.saltonstall/jottogame
npm install
```

Then proceed with [QUICK_START.md](QUICK_START.md) or [DEPLOYMENT.md](DEPLOYMENT.md)!
