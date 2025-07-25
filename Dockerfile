FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy everything else
COPY . .

# Debug: Check what files are in /app
RUN echo "[📁 FILES IN /app]" && ls -la

# Debug: Check if tsconfig.json is there
RUN echo "[📄 TSCONFIG.JSON]" && cat tsconfig.json || echo "❌ tsconfig.json not found"

# Debug: Check src folder
RUN echo "[📁 SRC FOLDER]" && ls -la src || echo "❌ src folder not found"

# Run build (this is where your error happens)
RUN echo "[⚙️ BUILDING...]" && npm run build

# Run build (this is where your error happens)
RUN echo "[⚙️ BUILDING...]" && npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

CMD ["node", "dist/main.js"]