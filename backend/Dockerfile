# Use an official Node.js runtime as the base image
FROM node:19-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy necessary files
COPY package*.json ./

RUN npm install

COPY . .

# Setup Prisma
RUN npx prisma generate
RUN npx prisma

# Expose port 3000 to the world outside the container
EXPOSE 3000

# Start the application and run migrations
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:db"]
