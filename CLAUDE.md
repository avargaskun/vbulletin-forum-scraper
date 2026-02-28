# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run scrape          # Run the forum scraper
npm run browse          # Launch the interactive CLI viewer
npm run export          # Export data to JSON or text
npm run db:reset        # Reset the SQLite database
npm run db:seed         # Seed the database with sample data
npm run generate        # Generate static HTML from database
npm run preview         # Serve the generated static HTML on port 3000
npm run build           # generate + preview
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier write
npm run format:check    # Prettier check
```

There is no test suite. All entry points are run directly with `ts-node`.

## Architecture

The project scrapes vBulletin forums, stores data in SQLite, and provides multiple ways to consume that data.

### Data flow

1. **`src/scraper/scraper.ts`** — Main orchestrator. Fetches pages via `node-fetch` (or FlareSolverr proxy), parses HTML with `cheerio` using CSS selectors from config, and writes to the database. Implements retry/backoff, pagination, resumable scraping via a `scraping_state` checkpoint in the DB, and optional file attachment downloads.

2. **`src/database/index.ts`** — All SQLite access via `better-sqlite3`. Tables: `subforums`, `threads`, `posts`, `users`, `files`, `downloaded_files`, `scraped_urls`, `scraping_state`. Uses WAL mode, insert-or-ignore for deduplication, and in-memory Set caches for URL/file tracking.

3. **`src/config.ts`** — Loads `.env` via `dotenv` and exports a single frozen `config` object. All CSS selectors, delays, limits, and the optional FlareSolverr URL come from here.

### Consumers

- **`src/cli/viewer.ts`** — Interactive terminal browser. Uses readline for navigation, Jimp for image-to-ASCII conversion.
- **`src/cli/exporter.ts`** — CLI (yargs) that dumps threads+posts to `export.json` or `export.txt`, with optional `--date` filter.
- **`src/frontend/html-generator.ts`** + **`src/frontend/server.ts`** — Generates a static HTML site into `dist/` using TSX components (compiled with `jsx: react-jsx`) then serves it on port 3000.

### Key design points

- CSS selectors are fully configurable via `.env`, so the scraper can target any vBulletin-based forum without code changes — see the Configuration table in README.md.
- FlareSolverr is opt-in: set `USE_FLARESOLVERR=http://host:8191/v1` to proxy all requests through it.
- The frontend uses TSX components that return raw HTML strings — there is no React runtime; `react-jsx` transform is used purely for JSX syntax sugar.
- Logging is done via `src/utils/logging.ts` (boxen-styled console output) and pino (`src/utils/pino-config.ts`).
