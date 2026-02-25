---
title: Installation
description: Install the MiniLedger private blockchain framework for Node.js via npm. Covers prerequisites, global and local installation, verifying your setup, and troubleshooting common issues.
keywords:
  - miniledger install
  - npm install miniledger
  - blockchain installation
  - node.js blockchain setup
  - private blockchain install
  - miniledger cli
  - miniledger prerequisites
slug: /getting-started/installation
sidebar_position: 1
---

# Installation

MiniLedger is distributed as a standard npm package. There are no native binaries to compile, no Docker images to pull, and no external databases to provision. If you have Node.js installed, you can have a working blockchain node in under a minute.

## Prerequisites

### Node.js

MiniLedger requires **Node.js version 22 or later**. This is needed for the native SQLite bindings, stable WebSocket APIs, and modern JavaScript features that MiniLedger relies on.

Check your current version:

```bash
node --version
```

If you need to install or upgrade Node.js, use one of the following methods:

**Using nvm (recommended):**

```bash
nvm install 22
nvm use 22
```

**Using the official installer:**

Download the latest LTS release from [nodejs.org](https://nodejs.org/) (version 22+).

**Using a package manager:**

```bash
# macOS (Homebrew)
brew install node@22

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows (Chocolatey)
choco install nodejs --version=22
```

### Operating System

MiniLedger runs on **macOS**, **Linux**, and **Windows**. All dependencies are pure JavaScript or use Node.js built-in modules, so no platform-specific compilation is required.

## Install MiniLedger

### Global Installation (Recommended for CLI Usage)

Install MiniLedger globally to make the `miniledger` CLI available system-wide:

```bash
npm install -g miniledger
```

After installation, the `miniledger` command is available in your terminal:

```bash
miniledger --version
```

### Local Installation (For Programmatic Use)

If you plan to embed MiniLedger within a Node.js application, install it as a project dependency:

```bash
npm install miniledger
```

You can then import it in your code:

```javascript
const { MiniLedger } = require('miniledger');
// or with ES modules
import { MiniLedger } from 'miniledger';
```

When installed locally, you can run CLI commands via `npx`:

```bash
npx miniledger --version
```

### Using npx Without Installing

You can run MiniLedger commands directly without a permanent installation:

```bash
npx miniledger init
npx miniledger start
```

This is useful for quick experiments or one-off demo sessions.

## Verify the Installation

After installing, run the following commands to confirm everything is working:

### 1. Check the version

```bash
miniledger --version
```

You should see output like:

```
miniledger v1.x.x
```

### 2. View available commands

```bash
miniledger --help
```

This displays the full list of CLI commands:

```
Usage: miniledger [command] [options]

Commands:
  init          Initialize a new MiniLedger node
  start         Start the blockchain node
  join          Join an existing cluster
  demo          Spin up a 3-node demo cluster
  status        Show node status
  tx submit     Submit a transaction
  query         Query the world state with SQL
  keys show     Display node identity keys
  peers list    List connected peers

Options:
  --version     Show version number
  --help        Show help
```

### 3. Initialize and start a test node

```bash
miniledger init
miniledger start
```

If the node starts successfully and you see log output indicating block production, your installation is complete. Press `Ctrl+C` to stop the node.

## Default Ports

MiniLedger uses two network ports by default:

| Port | Purpose |
|------|---------|
| **4440** | P2P communication (WebSocket) -- used for node-to-node consensus and block propagation |
| **4441** | REST API and block explorer dashboard -- used for client interactions |

Make sure these ports are available on your machine. If they are occupied, you can change them in the [configuration](/docs/getting-started/configuration).

## Default Data Directory

When you run `miniledger init`, a `./miniledger-data` directory is created in your current working directory. This directory contains:

```
miniledger-data/
  chain.db          # Block storage (SQLite)
  state.db          # World state (SQLite)
  keys/             # Ed25519 node identity keypair
  miniledger.config.json  # Node configuration
```

You can customize the data directory location using the `--data-dir` flag or the `dataDir` configuration option.

## Troubleshooting

### "command not found: miniledger"

If you installed globally but the command is not found, your npm global bin directory may not be in your `PATH`. Find and add it:

```bash
# Find the global bin directory
npm config get prefix

# Add to your shell profile (e.g., ~/.bashrc, ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Node.js version too old

If you see errors about unsupported syntax or missing APIs, verify your Node.js version:

```bash
node --version
```

MiniLedger requires Node.js 22 or later. Upgrade using `nvm` or your preferred method.

### Port already in use

If the node fails to start with an `EADDRINUSE` error, another process is using port 4440 or 4441. Either stop that process or configure MiniLedger to use different ports:

```bash
miniledger start --p2p-port 5550 --api-port 5551
```

See the [Configuration](/docs/getting-started/configuration) guide for all available port options.

### Permission errors on global install

If `npm install -g` fails with permission errors, do **not** use `sudo`. Instead, configure npm to use a directory you own:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="~/.npm-global/bin:$PATH"
```

Add the `PATH` export to your shell profile to make it permanent.

## Next Steps

Your installation is ready. Continue to the [Quick Start](/docs/getting-started/quickstart) guide to initialize a node, submit your first transaction, and query the world state.
