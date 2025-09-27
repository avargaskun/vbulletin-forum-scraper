FROM mcr.microsoft.com/devcontainers/typescript-node:22

USER root

RUN apt-get update && apt-get install -y \
    fish git curl wget vim sudo tree \
    build-essential python3 pkg-config libsqlite3-dev sqlite3

# Set fish as the default shell for the node user
RUN chsh -s /usr/bin/fish node

WORKDIR /app

# Copy package files and install dependencies as root
COPY ../package.json ./
COPY ../package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Change ownership of the app directory to the node user
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Set up fish shell prompt and aliases
SHELL ["/usr/bin/fish", "-c"]
RUN mkdir -p /home/node/.config/fish

RUN echo 'if status is-interactive' > /home/node/.config/fish/config.fish && \
    echo ' echo "-------------------------------------------------"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " 🚀 Welcome to the vbulletin-forum-scraper Dev Container!"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "-------------------------------------------------"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "Basic Usage:"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Run the scraper: npm run scrape"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Browse the data: npm run browse"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Reset database: npm run db:reset"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "-------------------------------------------------"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "Shortcuts:"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Type scrape to run the scraper"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Type browse to browse scraped data"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Type dbreset to reset the database"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "-------------------------------------------------"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "Development:"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Format code: npm run format"' >> /home/node/.config/fish/config.fish && \
    echo ' echo " - Check linting: npm run lint"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "-------------------------------------------------"' >> /home/node/.config/fish/config.fish && \
    echo ' echo "🔍 Type help to see available commands!"' >> /home/node/.config/fish/config.fish && \
    echo 'end' >> /home/node/.config/fish/config.fish

RUN echo 'alias scrape="npm run scrape"' >> /home/node/.config/fish/config.fish && \
    echo 'alias browse="npm run browse"' >> /home/node/.config/fish/config.fish && \
    echo 'alias dbreset="npm run db:reset"' >> /home/node/.config/fish/config.fish

CMD ["fish"]