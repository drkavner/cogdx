# Dockerfile for Mercury A2A Service
# Use a Bun base image for optimal performance
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb to install dependencies
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --production

# Copy the rest of the application code
COPY . .

# Expose the port the service runs on
EXPOSE 3100

# Command to run the application
CMD ["bun", "run", "service/index.ts"]
