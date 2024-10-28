# Use an official Node.js runtime as the base image
FROM node:19-alpine

# Set the working directory in the container
WORKDIR /app

COPY package*.json ./

# # Install dependencies
RUN npm install

COPY . .

# Expose port 8080 to the host
EXPOSE 8080

# todo: make it do npm run build for final product
# RUN npm run build

# Run the command to start the application
CMD ["npm", "run", "serve"]