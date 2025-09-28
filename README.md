# Vbulletin Forum Scraper 🚀

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A comprehensive forum scraper for the Hexus Forums using Node.js and TypeScript. Features pagination support, rate limiting, and a CLI viewer for browsing scraped content. This project also includes functionality to convert images to ASCII art.

## Features ✨

- Full forum scraping with pagination support
- Rate limiting and retry mechanisms
- Progress tracking and statistics
- SQLite database storage
- Minitel-inspired interactive CLI viewer with ASCII art support
- Error handling and recovery
- Configurable scraping parameters
- Image to ASCII art conversion

## Setup 🛠️

### Using the Dev Container (Recommended)

For the easiest and most consistent development experience, we highly recommend using the provided Dev Container. This will automatically set up a pre-configured environment with all the necessary tools and dependencies.

1. Install Docker and the VS Code Remote - Containers extension
2. Open the project in VS Code
3. When prompted, choose "Reopen in Container" - VS Code will build the container and connect to it

**Dev Container Benefits:**

- **Consistent Environment:** Ensures everyone is using the same versions of Node.js, and other tools
- **Pre-installed Dependencies:** All required dependencies are already installed within the container
- **Simplified Setup:** No need to manually install Node.js, or other tools on your local machine
- **Integrated Terminal:** The default terminal in the Dev Container is `fish`, a user-friendly shell
- **Helpful Shortcuts:**
  - `scrape`: Runs the scraper (`npm run scrape`)
  - `browse`: Runs the CLI viewer (`npm run browse`)
  - `dbreset`: Resets the database (`npm run db:reset`)
  - `help`: Displays help for the shell

### Manual Setup

If you prefer not to use the Dev Container, you can set up the project manually:

1. Clone the repository:

   ```bash
   git clone https://github.com/milesburton/vbulletin-forum-scraper.git
   ```

   **Important**: Ensure the project is in your WSL2 filesystem (e.g., `/home/<your_username>/`)

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration (see Configuration section below)

## Usage 📋

### Scraping the Forum ⚙️

Run the scraper:

```bash
npm run scrape
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
npm run browse
```

### Exporting Data 📤

You can export the scraped data to a file in either JSON or plain text format.

Run the exporter:

```bash
npm run export
```

By default, this command will export all threads and posts to a file named `export.json`.

**Options:**

-   `--format <format>`, `-f <format>`: Specify the output format.
    -   `json` (default): Exports data as a JSON file (`export.json`).
    -   `text`: Exports data as a plain text file (`export.txt`).
-   `--date <YYYY-MM-DD>`, `-d <YYYY-MM-DD>`: Only export threads with posts newer than the specified date.

**Examples:**

-   Export all data to a text file:
    ```bash
    npm run export -- --format text
    ```
-   Export posts newer than January 1st, 2023 to a JSON file:
    ```bash
    npm run export -- --date 2023-01-01
    ```
-   Export posts newer than June 15th, 2024 to a text file:
    ```bash
    npm run export -- --date 2024-06-15 --format text
    ```

Features:

- Browse subforums, threads, and posts with a Minitel-inspired interface
- Pagination support for large content
- Easy keyboard-based navigation
- Real-time statistics display
- ASCII art conversion for images
- Thread and subforum hierarchy visualization

Here's how it looks in action:

## Example Outputs 📷

### Forum Scraper

```
=== Forum Statistics ===
ℹ️  Total Threads: 45,678
ℹ️  Total Posts: 789,012
ℹ️  Total Users: 12,345
=====================

ℹ️  Getting forum statistics...
ℹ️  Starting forum scrape...
ℹ️  Found 8 subforums/child forums on https://forums.hexus.net
✅ Added subforum: Hardware Discussion with parentId null
ℹ️  Found 25 threads on page: https://forums.hexus.net/hardware-discussion
✅ Added thread: GPU Market Analysis 2024 (15 Jan 2024) by HexusPro
ℹ️  Found 45 posts on page https://forums.hexus.net/hardware-discussion/gpu-market

=== Scraping Progress ===
ℹ️  Time Elapsed: 145 seconds
ℹ️  Subforums: 8
ℹ️  Threads: 1,234/45,678 (2.7%)
ℹ️  Posts: 5,678/789,012 (0.7%)
ℹ️  Users: 456/12,345 (3.7%)
ℹ️  Pages Processed: 89
=======================
```

### CLI Viewer

The CLI viewer features a Minitel-inspired interface with ASCII art support:

```
╔══════════════════════════════════════════╗
║ 🗨️  Viewing Thread                        ║
╚══════════════════════════════════════════╝

ℹ️  Thread Stats: 👤 23, 👀 Last Post: 15 Jan 2024, 14:30

🗨️  TechGuru (15 Jan 2024, 14:30):
Just finished building my new setup! Here's how it looks:

     ┏━━━━━━┓
     ┃ □■■□ ┃
     ┃ ■□□■ ┃
     ┃ ■□□■ ┃
     ┃ □■■□ ┃
     ┗━━━━━━┛
[ASCII Art: Custom PC Build]

🗨️  HexusUser (15 Jan 2024, 14:32):
That's a clean build! What cooling solution did you use?

--------------------------------------------------

Showing posts 1-2 of 45

(P) Previous Page | (N) Next Page | (Enter) Return to thread list
```

### Additional Commands

```bash
npm run db:reset    # Reset the database
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format code with Prettier
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

## Using FlareSolverr (Optional)

If the target forum is protected by Cloudflare or other anti-bot measures, you can use [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) to bypass these protections.

1.  **Run FlareSolverr using Docker:**

    ```bash
    docker run -d \
      --name=flaresolverr \
      -p 8191:8191 \
      -e LOG_LEVEL=info \
      --restart unless-stopped \
      ghcr.io/flaresolverr/flaresolverr:latest
    ```

    This command will start a FlareSolverr container and make it accessible on port 8191.

2.  **Configure the scraper:**

    In your `.env` file, set the `USE_FLARESOLVERR` variable to the URL of your FlareSolverr instance:

    ```env
    USE_FLARESOLVERR=http://localhost:8191/v1
    ```

The scraper will then proxy its requests through FlareSolverr.

## Configuration ⚙️

The scraper is configured using environment variables, typically set in a `.env` file. Here's a breakdown of each option:

| Variable Name              | Description                                       | Default Value              | Type      |
| -------------------------- | ------------------------------------------------- | -------------------------- | --------- |
| `FORUM_URL`                | The base URL of the forum to scrape               | `""`                       | `string`  |
| `FORUM_URL_START_AT`       | The subforum URL where to start scraping          | (value of `FORUM_URL`)     | `string`  |
| `DATABASE_PATH`            | Path to the SQLite database file                  | `data/forum_data.db`       | `string`  |
| `USER_AGENT`               | User-Agent string for HTTP requests               | (Chrome User Agent)        | `string`  |
| `HEADERS`                  | HTTP headers to include with requests             | (Chrome User Agent header) | `object`  |
| `DELAY_BETWEEN_REQUESTS`   | Delay (ms) between consecutive requests           | `500`                      | `number`  |
| `MAX_RETRIES`              | Maximum number of times to retry a failed request | `3`                        | `number`  |
| `RETRY_DELAY`              | Delay (ms) before retrying a failed request       | `5000`                     | `number`  |
| `SUBFORUM_DELAY`           | Additional delay (ms) after scraping a subforum   | `10000`                    | `number`  |
| `DOWNLOAD_FILES`           | Whether to download files linked in posts         | `false`                    | `boolean` |
| `TEST_MODE`                | Enables test mode for development/testing         | `false`                    | `boolean` |
| `MAX_SUBFORUMS`            | Maximum number of subforums to scrape             | `null`                     | `number?` |
| `MAX_THREADS_PER_SUBFORUM` | Maximum threads to scrape per subforum            | `null`                     | `number?` |
| `MAX_POSTS_PER_THREAD`     | Maximum posts to scrape per thread                | `null`                     | `number?` |
| `MAX_PAGES_PER_SUBFORUM`   | Maximum pages to scrape per subforum              | `null`                     | `number?` |
| `MAX_PAGES_PER_THREAD`     | Maximum pages to scrape per thread                | `null`                     | `number?` |
| `USE_FLARESOLVERR`         | Address of a [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) instance to use. See above. | `null` | `string` |

**Example `.env` file:**

```env
FORUM_URL=https://forums.hexus.net
DATABASE_PATH=data/my_forum_data.db
DELAY_BETWEEN_REQUESTS=1000
MAX_RETRIES=5
DOWNLOAD_FILES=true
TEST_MODE=false
MAX_SUBFORUMS=5
MAX_THREADS_PER_SUBFORUM=10
MAX_POSTS_PER_THREAD=20
```

## Overriding CSS Selectors

The scraper can be adapted to work with different forum layouts or themes by overriding the default CSS selectors. You can change these values in your `.env` file.

| Variable                          | Description                                               | Default Value                                                                                             |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `CSS_SELECTOR_SUBFORUM`           | Selector for links to subforums on a forum page.          | `ol#forums > li.forumbit_nopost > ol.childforum > li.forumbit_post h2.forumtitle > a`                      |
| `CSS_SELECTOR_THREAD`             | Selector for the container of each thread on a subforum page. | `#threads > li.threadbit`                                                                                 |
| `CSS_SELECTOR_THREAD_TITLE`       | Selector for the title link of a thread.                  | `h3.threadtitle a.title`                                                                                  |
| `CSS_SELECTOR_THREAD_AUTHOR_DATE` | Selector for the element containing thread author and date. | `.threadmeta .author span.label`                                                                          |
| `CSS_SELECTOR_STATS_THREADS`      | Selector for the total number of threads on the forum.    | `dt:contains("Threads") + dd`                                                                             |
| `CSS_SELECTOR_STATS_POSTS`        | Selector for the total number of posts on the forum.      | `dt:contains("Posts") + dd`                                                                               |
| `CSS_SELECTOR_STATS_MEMBERS`      | Selector for the total number of members on the forum.    | `dt:contains("Members") + dd`                                                                             |
| `CSS_SELECTOR_PAGINATION`         | Selector for the 'next page' link.                        | `a[rel="next"]`                                                                                           |
| `CSS_SELECTOR_PAGINATION_LAST`    | Selector for the last page link in a pagination control.  | `div[id*="-pagenav-"] .pagination a`                                                                       |
| `CSS_SELECTOR_POST`               | Selector for the container of an individual post.         | `li.postcontainer`                                                                                        |
| `CSS_SELECTOR_POST_AUTHOR`        | Selector for the author's username within a post.         | `.username strong`                                                                                        |
| `CSS_SELECTOR_POST_AUTHOR_LINK`   | Selector for the link to the author's profile.            | `a.username`                                                                                              |
| `CSS_SELECTOR_POST_CONTENT`       | Selector for the main content of a post.                  | `div[id^="post_message_"] blockquote.postcontent`                                                         |
| `CSS_SELECTOR_POST_TIMESTAMP`     | Selector for the timestamp of a post.                     | `div.posthead span.postdate span.date`                                                                    |
| `CSS_SELECTOR_POST_IMAGE`         | Selector for images within a post's content.              | `.js-post__content-text img[src]`                                                                         |
| `CSS_SELECTOR_POST_ID_ATTRIBUTE`  | The HTML attribute that contains the unique post ID.      | `data-node-id`                                                                                            |
| `CSS_SELECTOR_POST_ID_REGEX`      | The regex to extract the post ID from the attribute.      | `(\\d+)`                                                                                                  |

### Example: Subforum Page

If the HTML for a list of subforums looks like this:

```html
<div class="forum-list">
  <div class="forum-item">
    <h2><a href="/gadgets-forum">Gadgets</a></h2>
  </div>
  <div class="forum-item">
    <h2><a href="/software-forum">Software</a></h2>
  </div>
</div>
```

You would set the following in your `.env` file:

```env
CSS_SELECTOR_SUBFORUM=".forum-item h2 a"
```

### Example: Thread Page

If the HTML for a thread's posts looks like this:

```html
<div class="post-list">
  <article class="post" data-post-id="12345">
    <div class="author-details">
      <a href="/user/johndoe" class="username">JohnDoe</a>
    </div>
    <div class="post-body">
      <p>This is the first post content.</p>
      <img src="/images/my-image.jpg">
    </div>
    <div class="post-meta">
      <span class="timestamp">Jan 01, 2025</span>
    </div>
  </article>
</div>
<div class="pagination">
    <a href="/thread?page=2" class="next-page">Next</a>
</div>
```

You would set the following in your `.env` file:

```env
CSS_SELECTOR_POST="article.post"
CSS_SELECTOR_POST_ID_ATTRIBUTE="data-post-id"
CSS_SELECTOR_POST_ID_REGEX="(\\d+)"
CSS_SELECTOR_POST_AUTHOR=".username"
CSS_SELECTOR_POST_CONTENT=".post-body p"
CSS_SELECTOR_POST_IMAGE=".post-body img"
CSS_SELECTOR_POST_TIMESTAMP=".timestamp"
CSS_SELECTOR_PAGINATION="a.next-page"
```

## Error Handling 🔧

The scraper includes:

- Retry mechanism for failed requests
- Rate limiting to prevent server overload
- Graceful shutdown handling
- Detailed error logging

## Contributing 🤝

1. Fork the repository from [milesburton/vbulletin-forum-scraper](https://github.com/milesburton/vbulletin-forum-scraper)
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License 📝

This project is licensed under the MIT Licence - see the [LICENSE](LICENSE) file for details.
