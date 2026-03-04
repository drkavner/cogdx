# Dockerfile for Mercury A2A Service
# Use a Bun base image for optimal performance
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json first (no lockfile required)
COPY package.json ./

# Install dependencies (none currently, but keeps Dockerfile future-proof)
RUN bun install --production --no-save

# Copy the rest of the application code
COPY . .

# Expose the port the service runs on
EXPOSE 3100

# Command to run the application
CMD ["bun", "run", "service/index.ts"]
