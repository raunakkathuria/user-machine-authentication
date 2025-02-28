FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create directories for keys if they don't exist
RUN mkdir -p keys/private keys/public

# Expose the port
EXPOSE 3003

# Set the command to run the server
CMD ["node", "src/app.js"]