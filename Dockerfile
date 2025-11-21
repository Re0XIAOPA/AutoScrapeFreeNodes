FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data

# Expose port (default to 3000, but app uses 3001 by default in config)
EXPOSE 3000 3001

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
