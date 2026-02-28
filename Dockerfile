FROM node:22-alpine

# better-sqlite3 requires a C++ toolchain via node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy manifests first for layer cache efficiency
COPY package.json package-lock.json ./

# Installs all deps including devDeps (typescript required by ts-node at runtime)
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Create runtime directories and set ownership
RUN mkdir -p data dist && chown -R node:node /app

USER node

# Mount database and generated HTML outside the container:
#   -v ./data:/app/data     (SQLite database)
#   -v ./dist:/app/dist     (generated static HTML)
# For export.json/export.txt, use: docker cp <container>:/app/export.json .
# Config via --env-file .env or -e VAR=value; or mount: -v ./.env:/app/.env
VOLUME ["/app/data", "/app/dist"]

EXPOSE 3000

# Pass npm script name as docker run argument:
#   docker run <image>           → npm run scrape  (default)
#   docker run <image> export    → npm run export
#   docker run <image> generate  → npm run generate
#   docker run <image> browse    → npm run browse  (requires -it)
ENTRYPOINT ["npm", "run"]
CMD ["scrape"]
