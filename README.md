# Hexus Forum Scraper 🚀

A comprehensive forum scraper for the Hexus Forums using Bun and TypeScript. Features pagination support, rate limiting, and a CLI viewer for browsing scraped content.

## Features ✨

- Full forum scraping with pagination support
- Rate limiting and retry mechanisms
- Progress tracking and statistics
- SQLite database storage
- Interactive CLI viewer
- Error handling and recovery
- Configurable scraping parameters

## Setup 🛠️

1. Clone the repository
   ```bash
   git clone https://github.com/milesburton/hexus-forum-scraper.git
   ```
   **Important**: Ensure the project is in your WSL2 file system (e.g., /home/<your_username>/)

2. Install dependencies
   ```bash
   bun install
   ```

3. Create a .env file with the following configuration:
   ```env
   FORUM_URL=https://forums.example.com
   DATABASE_PATH=data/forum_data.db
   DELAY_BETWEEN_REQUESTS=2000
   MAX_RETRIES=3
   RETRY_DELAY=5000
   SUBFORUM_DELAY=10000
   ```

## Usage 📋

### Scraping the Forum ⚙️

Run the scraper:
```bash
bun run scrape
```

The scraper will:
- Create/reset the database if requested
- Scrape all subforums
- Follow pagination for threads and posts
- Display progress statistics
- Handle errors gracefully

### Browsing Scraped Data 🖥️

Launch the CLI viewer:
```bash
bun run browse
```

Features:
- Browse subforums, threads, and posts
- Pagination support for large content
- Easy navigation
- Statistics display

### Additional Commands

```bash
bun run db:reset    # Reset the database
bun run lint        # Run ESLint
bun run lint:fix    # Fix ESLint issues
bun run format      # Format code with Prettier
```

## Project Structure 📁

```
src/
├── config.ts           # Configuration management
├── types/
│   └── types.ts       # TypeScript interfaces and types
├── database/
│   └── index.ts       # Database operations
├── scraper/
│   └── scraper.ts     # Main scraping logic
└── cli/
    └── viewer.ts      # CLI viewer application
```

## Error Handling 🔧

The scraper includes:
- Retry mechanism for failed requests
- Rate limiting to prevent server overload
- Graceful shutdown handling
- Detailed error logging

## Contributing 🤝

1. Fork the repository from [milesburton/hexus-forum-scraper](https://github.com/milesburton/hexus-forum-scraper)
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Licence 📝

MIT Licence. See LICENCE file for details.
