# hexus-forum-scraper 🚀

🚨 Work in progress

A scraper for the Hexus Forums using Bun and TypeScript.

## Setup 🛠️

1. Clone the repository. **Make sure the project is in your WSL2 file system (e.g., /home/<your_username>/).**
2. Install Docker and VS Code with the Remote - Containers extension.
3. Open the project in VS Code.
4. The devcontainer will automatically build and launch.

## Usage
### Scraping the Forum ⚙️

1. Install dependencies: `bun install`
2. Run the scraper: `bun run dev`

This will scrape the Hexus Forums and store the data in a SQLite database.

### Browsing the Scraped Data (Command-Line Interface) 🖥️

1. Run `bun install` (if you haven't already).
2. Run `bun run browse`

This will start a Minitel-style command-line application that allows you to browse the scraped forum data.

## License 📝

MIT License. See LICENSE file for details.
