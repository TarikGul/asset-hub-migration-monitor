# AH Monitoring

A monitoring dashboard for Asset Hub migration status and XCM message tracking.

## Prerequisites

- Node.js (v18 or later)
- Yarn package manager
    - If you dont have run you can install it with npm globally: `npm install -g yarn`
- Just command runner (`brew install just` on macOS)

## Environment Variables

Before running the application, you need to set the following environment variables:

```bash
# Asset Hub WebSocket URL
export ASSET_HUB_URL="wss://your-asset-hub-node.io"

# Relay Chain WebSocket URL
export RELAY_CHAIN_URL="wss://your-relay-chain-node.io"
```

## Installation

1. Clone the repository:
```bash
git clone git@github.com:TarikGul/asset-hub-migration-monitor.git
cd asset-hub-migration-monitor
```

2. Install dependencies and start the application:
```bash
just run
```

This command will:
- Install all dependencies for both frontend and backend
- Build both frontend and backend
- Migrate and create the DB
- Start both development servers

## Development

The application consists of two parts:

### Backend
- Runs on `http://localhost:8080`
- Handles WebSocket connections to Asset Hub and Relay Chain
- Processes and stores migration status and XCM message data
- Provides SSE endpoints for real-time updates

### Frontend
- Runs on `http://localhost:3000`
- Displays migration status and XCM message counters
- Shows real-time block numbers for both chains
- Updates automatically via SSE

## Available Commands

- `just install` - Install dependencies for both frontend and backend
- `just build` - Build both frontend and backend
- `just run-backend` - Run backend development server
- `just run-frontend` - Run frontend development server
- `just dev` - Run both frontend and backend in development mode
- `just clean` - Clean build artifacts
- `just run` - Setup everything and run in development mode
