# Use an official Node.js runtime as the base image
FROM node:19-alpine

# Set the working directory in the container
WORKDIR /app

COPY package*.json ./

# Create a non-root user with UID 1200 (matching your frontend setup)
RUN adduser -D -u 1200 appuser

# Set the working directory and set ownership to the new user
WORKDIR /app
RUN chown appuser:appuser /app

# Switch to the non-root user
USER appuser

# Copy package files and install dependencies as the non-root user
COPY --chown=appuser:appuser package*.json ./
RUN npm install

# Copy application files with correct ownership
COPY --chown=appuser:appuser . .

# Expose port 8080 to the host
EXPOSE 8080

# todo: make it do npm run build for final product
# RUN npm run build

# Run the command to start the application
CMD ["npm", "run", "serve"]