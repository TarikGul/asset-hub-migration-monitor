# List available commands
default:
    @just --list

# Install dependencies for both frontend and backend
install:
    #!/usr/bin/env bash
    echo "Installing backend dependencies..."
    cd backend && yarn install && cd ..
    echo "Installing frontend dependencies..."
    cd frontend && yarn install && cd ..

db:
    #!/usr/bin/env bash
    cd backend && yarn migrate && yarn push && cd ..

db-clean:
    #!/usr/bin/env bash
    cd backend && rm -rf sqlite.db && yarn migrate && yarn push && cd ..

# Build both frontend and backend
build:
    #!/usr/bin/env bash
    echo "Building backend..."
    cd backend && yarn build && cd ..
    echo "Building frontend..."
    cd frontend && yarn build && cd ..

# Run backend development server
run-backend:
    #!/usr/bin/env bash
    cd backend && yarn start && cd ..

# Run frontend development server
run-frontend:
    #!/usr/bin/env bash
    cd frontend && yarn start && cd ..

# Run both frontend and backend in development mode
dev:
    #!/usr/bin/env bash
    just run-backend & just run-frontend

# Clean build artifacts
clean:
    #!/usr/bin/env bash
    echo "Cleaning backend..."
    cd backend && rm -rf build
    echo "Cleaning frontend..."
    cd frontend && rm -rf dist

# Setup everything and run in development mode
run:
    #!/usr/bin/env bash
    just install
    just db
    just build
    just dev

# Setup everything and run in development mode, clean database first
run-clean:
    #!/usr/bin/env bash
    just install
    just db-clean
    just build
    just dev
