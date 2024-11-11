# Use an official Node.js runtime as the base image
FROM node:19-alpine

# Set the working directory in the container and create a non-root user
WORKDIR /usr/src/app
RUN adduser -D -u 1100 appuser && chown appuser:appuser /usr/src/app

# Copy package files and install dependencies
COPY --chown=appuser:appuser package*.json ./
# COPY package*.json ./
RUN npm ci

COPY . .

# Setup Prisma
RUN npx prisma generate
RUN mkdir -p /usr/src/app/dist && chown -R appuser:appuser /usr/src/app/dist
RUN chown -R appuser:appuser /usr/src/app/node_modules/.prisma

# Switch to the non-root user
USER appuser

# Expose port 3000 to the world outside the container
EXPOSE 3000

# Start the application and run migrations
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:db"]
