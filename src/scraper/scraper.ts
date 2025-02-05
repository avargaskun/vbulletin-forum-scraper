import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { config } from '../config';
import { askQuestion } from '../utils/readline';
import {
    initialiseDatabase,
    insertSubforum,
    insertThread,
    insertPost,
    getUserCount,
    closeDatabase
} from '../database';
import {
    EMOJI_SUCCESS,
    EMOJI_ERROR,
    EMOJI_WARN,
    EMOJI_INFO,
    type ScrapingStats,
    type FetchError,
    type ForumStats
} from '../types/types';


let stats: ScrapingStats = {
    subforums: 0,
    threads: 0,
    posts: 0,
    users: 0,
    pagesProcessed: 0,
    startTime: new Date()
};

let lastRequestTime = 0;

async function delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < config.DELAY_BETWEEN_REQUESTS) {
        await delay(config.DELAY_BETWEEN_REQUESTS - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();
}

function printProgress(): void {
    const duration = (new Date().getTime() - stats.startTime.getTime()) / 1000;
    console.log('\n=== Scraping Progress ===');
    console.log(`${EMOJI_INFO} Time Elapsed: ${duration.toFixed(0)} seconds`);
    console.log(`${EMOJI_INFO} Subforums: ${stats.subforums}`);

    if (stats.totals) {
        console.log(`${EMOJI_INFO} Threads: ${stats.threads}/${stats.totals.totalThreads} (${stats.percentComplete?.threads}%)`);
        console.log(`${EMOJI_INFO} Posts: ${stats.posts}/${stats.totals.totalPosts} (${stats.percentComplete?.posts}%)`);
        console.log(`${EMOJI_INFO} Users: ${stats.users}/${stats.totals.totalUsers} (${stats.percentComplete?.users}%)`);
    } else {
        console.log(`${EMOJI_INFO} Threads: ${stats.threads}`);
        console.log(`${EMOJI_INFO} Posts: ${stats.posts}`);
        console.log(`${EMOJI_INFO} Users: ${stats.users}`);
    }

    console.log(`${EMOJI_INFO} Pages Processed: ${stats.pagesProcessed}`);
    console.log('=======================\n');
}

function createFetchError(type: FetchError['type'], message: string, status?: number): FetchError {
    const error = new Error(message) as FetchError;
    error.type = type;
    if (status) error.status = status;
    return error;
}

async function fetchWithRetry(url: string): Promise<string> {
    let lastError: FetchError | null = null;

    for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt++) {
        try {
            await rateLimit();
            console.log(`${EMOJI_INFO} Fetching: ${url} (Attempt ${attempt}/${config.MAX_RETRIES})`);

            const response = await fetch(url, { headers: config.HEADERS });

            if (!response.ok) {
                throw createFetchError('http', `HTTP error! status: ${response.status}`, response.status);
            }

            const text = await response.text();

            if (!text || text.length === 0) {
                throw createFetchError('empty', 'Empty response received');
            }

            return text;

        } catch (error) {
            lastError = error instanceof Error
                ? createFetchError('network', error.message)
                : createFetchError('network', 'Unknown error occurred');

            console.error(`${EMOJI_ERROR} Attempt ${attempt} failed:`, lastError.message);

            if (attempt < config.MAX_RETRIES) {
                const delayTime = config.RETRY_DELAY * attempt;
                console.log(`${EMOJI_WARN} Waiting ${delayTime/1000} seconds before retry...`);
                await delay(delayTime);
            }
        }
    }

    throw createFetchError(
        lastError?.type || 'network',
        `All ${config.MAX_RETRIES} attempts failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
}

async function getForumStats(): Promise<ForumStats> {
    const html = await fetchWithRetry(config.FORUM_URL);
    const $ = cheerio.load(html);

    const totals: ForumStats = {
        totalThreads: 0,
        totalPosts: 0,
        totalUsers: 0
    };

    try {
        // Extract values based on <dt> and <dd> structure
        totals.totalThreads = parseInt($('dt:contains("Threads") + dd').text().replace(/,/g, ''));
        totals.totalPosts = parseInt($('dt:contains("Posts") + dd').text().replace(/,/g, ''));
        totals.totalUsers = parseInt($('dt:contains("Members") + dd').text().replace(/,/g, ''));


        // Output parsed statistics (rest of the function is the same)
        console.log('\n=== Forum Statistics ===');
        console.log(`${EMOJI_INFO} Total Threads: ${totals.totalThreads.toLocaleString()}`);
        console.log(`${EMOJI_INFO} Total Posts: ${totals.totalPosts.toLocaleString()}`);
        console.log(`${EMOJI_INFO} Total Users: ${totals.totalUsers.toLocaleString()}`);
        console.log('=====================\n');

        if (totals.totalThreads === 0 || totals.totalPosts === 0 || totals.totalUsers === 0) {
            throw new Error('Failed to parse forum statistics');
        }

        return totals;
    } catch (error) {
        console.error(`${EMOJI_ERROR} Error parsing forum statistics:`, error);
        throw error;
    }
}

function updatePercentages(): void {
    if (!stats.totals) return;

    stats.percentComplete = {
        users: stats.totals.totalUsers === 0 ? 0 : Math.round((stats.users / stats.totals.totalUsers) * 100), // Handle 0 totals
        threads: stats.totals.totalThreads === 0 ? 0 : Math.round((stats.threads / stats.totals.totalThreads) * 100),
        posts: stats.totals.totalPosts === 0 ? 0 : Math.round((stats.posts / stats.totals.totalPosts) * 100)
    };
}

async function scrapeSubforums(): Promise<void> {
    const html = await fetchWithRetry(config.FORUM_URL);
    const $ = cheerio.load(html);
    const subforums = $('h2.forumtitle a');

    console.log(`${EMOJI_INFO} Found ${subforums.length} subforums`);

    for (const element of subforums) {
        try {
            const title = $(element).text().trim();
            if (!title) {
                console.error(`${EMOJI_ERROR} Skipping subforum with empty title`);
                continue;
            }

            const href = $(element).attr('href');
            if (!href) {
                console.error(`${EMOJI_ERROR} Skipping subforum "${title}" with no URL`);
                continue;
            }

            const url = new URL(href, config.FORUM_URL).href;
            insertSubforum(title, url);
            console.log(`${EMOJI_SUCCESS} Added subforum: ${title}`);
            stats.subforums++;

            await scrapeSubforumThreads(url);
            await delay(config.SUBFORUM_DELAY);
        } catch (error) {
            console.error(`${EMOJI_ERROR} Failed to process subforum:`, error);
        }
    }
}

async function scrapeThreadCreator(threadUrl: string): Promise<{ creator: string; createdAt: string }> {
    try {
        const html = await fetchWithRetry(threadUrl);
        const $ = cheerio.load(html);
        const creator = $('.postauthor').first().text().trim() || "Unknown";
        const createdAt = $('.postdate').first().text().trim() || new Date().toISOString();
        return { creator, createdAt };
    } catch (error) {
        console.error(`${EMOJI_ERROR} Failed to scrape thread creator for ${threadUrl}:`, error);
        return { creator: "Unknown", createdAt: new Date().toISOString() };
    }
}

async function scrapeSubforumThreads(subforumUrl: string): Promise<void> {
    let pageUrl: string = subforumUrl;

    while (pageUrl) {
        try {
            const html = await fetchWithRetry(pageUrl);
            const $ = cheerio.load(html);
            const threads = $('h3.threadtitle a');

            console.log(`${EMOJI_INFO} Found ${threads.length} threads on page`);
            stats.pagesProcessed++;

            for (const thread of threads) {
                try {
                    const $thread = $(thread);
                    const title = $thread.text().trim();
                    const href = $thread.attr('href');

                    if (!title || !href) continue;

                    const threadUrl = new URL(href, config.FORUM_URL).href;
                    const { creator, createdAt } = await scrapeThreadCreator(threadUrl);

                    insertThread(subforumUrl, title, threadUrl, creator, createdAt);
                    console.log(`${EMOJI_SUCCESS} Added thread: ${title} (${createdAt})`);
                    stats.threads++;

                    await scrapeThreadPosts(threadUrl);
                    stats.threads++;
                    updatePercentages();
                    if (stats.threads % 10 === 0) printProgress();

                    await delay(config.DELAY_BETWEEN_REQUESTS);
                } catch (error) {
                    console.error(`${EMOJI_ERROR} Failed to process thread:`, error);
                }
            }

            const nextLink = $('.pagination .next a').attr('href');
            pageUrl = nextLink ? new URL(nextLink, config.FORUM_URL).href : '';

            if (pageUrl) {
                await delay(config.DELAY_BETWEEN_REQUESTS);
            }
        } catch (error) {
            console.error(`${EMOJI_ERROR} Failed to scrape page:`, error);
            break;
        }
    }
}

async function scrapeThreadPosts(threadUrl: string): Promise<void> {
    let pageUrl: string = threadUrl;

    while (pageUrl) {
        try {
            const html = await fetchWithRetry(pageUrl);
            const $ = cheerio.load(html);
            const posts = $('.postcontainer');

            console.log(`${EMOJI_INFO} Found ${posts.length} posts`);

            for (const post of posts) {
                try {
                    const $post = $(post);
                    const username = $post.find('.username').text().trim();
                    const comment = $post.find('.postcontent').text().trim();
                    const postedAt = $post.find('.postdate').text().trim() || new Date().toISOString();

                    if (!username || !comment) continue;

                    insertPost(threadUrl, username, comment, postedAt);
                    stats.posts++;
                    stats.users = getUserCount();
                    updatePercentages();
                    if (stats.posts % 100 === 0) printProgress();
                    
                } catch (error) {
                    console.error(`${EMOJI_ERROR} Failed to process post:`, error);
                }
            }

            const nextLink = $('.pagination .next a').attr('href');
            pageUrl = nextLink ? new URL(nextLink, config.FORUM_URL).href : '';

            if (pageUrl) {
                await delay(config.DELAY_BETWEEN_REQUESTS);
            }
        } catch (error) {
            console.error(`${EMOJI_ERROR} Failed to scrape posts:`, error);
            break;
        }
    }
}

async function confirmScrape(): Promise<boolean> {
    const answer = await askQuestion('Continue with scrape? (y/N) ');
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function main() {
    try {
        stats = {
            subforums: 0,
            threads: 0,
            posts: 0,
            users: 0,
            pagesProcessed: 0,
            startTime: new Date()
        };

        await initialiseDatabase();
        console.log(`${EMOJI_INFO} Getting forum statistics...`);
        stats.totals = await getForumStats();

        if (!await confirmScrape()) {
            console.log(`${EMOJI_INFO} Scraping cancelled.`);
            return;
        }

        console.log(`${EMOJI_INFO} Starting forum scrape...`);
        await scrapeSubforums();

        console.log('\nFinal Statistics:');
        updatePercentages();
        printProgress();

        console.log(`${EMOJI_SUCCESS} Scraping completed successfully.`);
    } catch (error) {
        console.error(`${EMOJI_ERROR} Fatal error:`, error);
    } finally {
        closeDatabase();
    }
}

main();
