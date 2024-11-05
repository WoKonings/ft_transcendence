# Use an official Node.js runtime as the base image
FROM node:19-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Create a non-root user with UID 1100 (matching your backend setup)
RUN adduser -D -u 1100 appuser

# Set the working directory and set ownership to the new user
WORKDIR /usr/src/app
RUN chown appuser:appuser /usr/src/app

# Switch to the non-root user
USER appuser

# Copy package files and install dependencies
COPY --chown=appuser:appuser package*.json ./
RUN npm install

COPY . .

# Setup Prisma
RUN npx prisma generate
RUN npx prisma

# Expose port 3000 to the world outside the container
EXPOSE 3000

# Start the application and run migrations
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:db"]
