import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { setupDatabase, insertSubforum, insertThread, insertPost, getSubforums, closeDatabase } from '../database';

dotenv.config();

const FORUM_URL = process.env.FORUM_URL || "";
const USER_AGENT = "Mozilla/5.0 (Custom Scraper)";
const HEADERS = { 'User-Agent': USER_AGENT };

async function fetchHTML(url: string): Promise<string> {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.text();
}

async function scrapeSubforums(): Promise<void> {
    if (!FORUM_URL) throw new Error("FORUM_URL is not defined in .env file");

    const html = await fetchHTML(FORUM_URL);
    const $ = cheerio.load(html);
    const subforums = $('h2.forumtitle a');

    subforums.each((_, element) => {
        const title = $(element).text().trim();
        const url = new URL($(element).attr('href') || '', FORUM_URL).href;
        insertSubforum(title, url);
        console.log(`✅ Added subforum: ${title}`);
    });
}

async function scrapeThreads(subforumUrl: string): Promise<void> {
    const html = await fetchHTML(subforumUrl);
    const $ = cheerio.load(html);
    const threads = $('h3.threadtitle a');

    await Promise.allSettled(threads.map(async (_, element) => {
        const title = $(element).text().trim();
        const threadUrl = new URL($(element).attr('href') || '', FORUM_URL).href;
        const creator = await scrapeThreadCreator(threadUrl);
        insertThread(subforumUrl, title, threadUrl, creator);
        await scrapeComments(threadUrl);
        console.log(`✅ Added thread: ${title}`);
    }));
}

async function scrapeThreadCreator(threadUrl: string): Promise<string> {
    const html = await fetchHTML(threadUrl);
    const $ = cheerio.load(html);
    return $('span.author').text().trim() || "Unknown";
}

async function scrapeComments(threadUrl: string): Promise<void> {
    const html = await fetchHTML(threadUrl);
    const $ = cheerio.load(html);
    const comments = $('div.content');
    const usernames = $('span.username');

    comments.each((index, element) => {
        const comment = $(element).text().trim();
        const username = $(usernames[index]).text().trim();
        if (username && comment) {
            insertPost(threadUrl, username, comment);
            console.log(`🗨️  ${username}: ${comment.substring(0, 50)}...`);
        }
    });
}

async function main() {
    setupDatabase();
    await scrapeSubforums();

    const subforums = getSubforums();
    await Promise.allSettled(subforums.map(subforum => scrapeThreads(subforum.url)));

    closeDatabase();
}

main().catch(error => console.error(`❌ Error:`, error));
