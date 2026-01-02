FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 3001

# Command to run the server
CMD ["node", "src/index.js"]
