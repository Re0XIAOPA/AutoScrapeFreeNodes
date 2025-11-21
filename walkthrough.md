# Dockerization Walkthrough

I have successfully dockerized the `AutoScrapeFreeNodes` project. Here is a summary of the changes and how to use them.

## Changes Made

1.  **Created `.dockerignore`**:
    - Excluded `node_modules`, `data`, `.git`, etc. to keep the image clean and build fast.

2.  **Created `Dockerfile`**:
    - Base image: `node:18-alpine` (lightweight and secure).
    - Installs production dependencies.
    - Exposes port 3000 and 3001.
    - Sets up a volume for persistent data storage.

3.  **Created `docker-compose.yml`**:
    - Defines the `autoscrape` service.
    - Maps host port 3000 to container port 3000.
    - Mounts the `./data` directory to persist scraped nodes.
    - Sets the timezone to `Asia/Shanghai`.

4.  **Updated `README.md`**:
    - Added a "Docker Deployment" section with clear instructions.

## How to Run

### Using Docker Compose (Recommended)

Run the following command in the project root:

```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`.

### Using Docker CLI

Build the image:

```bash
docker build -t autoscrape-free-nodes .
```

Run the container:

```bash
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name autoscrape autoscrape-free-nodes
```
