import * as cheerio from 'cheerio';
import { config } from '../config';
import {
    initialiseDatabase,
    insertSubforum,
    insertThread,
    insertPost,
    insertFile,
    getSubforums,
    getThreadsBySubforum,
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
import { askQuestion } from '../utils/readline';


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
        totals.totalThreads = parseInt($('dt:contains("Threads") + dd').text().replace(/,/g, ''), 10);
        totals.totalPosts = parseInt($('dt:contains("Posts") + dd').text().replace(/,/g, ''), 10);
        totals.totalUsers = parseInt($('dt:contains("Members") + dd').text().replace(/,/g, ''), 10);

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
         users: stats.totals.totalUsers === 0 ? 0 : Math.round((stats.users / stats.totals.totalUsers) * 100),
        threads: stats.totals.totalThreads === 0 ? 0 : Math.round((stats.threads / stats.totals.totalThreads) * 100),
        posts: stats.totals.totalPosts === 0 ? 0 : Math.round((stats.posts / stats.totals.totalPosts) * 100)
    };
}
async function scrapeSubforums(): Promise<void> {
    const html = await fetchWithRetry(config.FORUM_URL);
    if (!html) {
        console.error(`${EMOJI_ERROR} Failed to fetch forum HTML.`);
        return;
    }
    const $ = cheerio.load(html);

     // Correctly select ALL subforum links.
     const subforumLinks = $('li.forumbit_post h2.forumtitle a');

    console.log(`${EMOJI_INFO} Found ${subforumLinks.length} subforums`);

    for (const element of subforumLinks.toArray()) {
        const $link = $(element);
        const title = $link.text().trim();
        const href = $link.attr('href');

        if (!title || !href) {
            console.log(`${EMOJI_WARN} Invalid forum title or href`);
            continue;
        }

        const url = new URL(href, config.FORUM_URL).href;
        insertSubforum(title, url);
        console.log(`${EMOJI_SUCCESS} Added subforum: ${title}`);
        stats.subforums++;
        try {
            await scrapeSubforumThreads(url);
            await delay(config.SUBFORUM_DELAY);
        } catch (error){
            console.error("Failed to scrape threads in subforum", error)
        }
    }
}

async function scrapeSubforumThreads(subforumUrl: string): Promise<void> {
    let pageUrl: string = subforumUrl;

    while (pageUrl) {
        try {
            const html = await fetchWithRetry(pageUrl);
            if (!html) {
                console.error(`${EMOJI_ERROR} Failed to fetch subforum HTML: ${pageUrl}`);
                return;
            }
            const $ = cheerio.load(html);

            // Correct thread selector:  Direct children of #threads.
            const threadRows = $("#threads > li.threadbit");

            console.log(`${EMOJI_INFO} Found ${threadRows.length} threads on page: ${pageUrl}`);
            stats.pagesProcessed++;

            for (const threadRow of threadRows.toArray()) {
                try {
                    const $threadRow = $(threadRow);

                    // Title selector: a with class title, inside an h3.
                    const titleLink = $threadRow.find('h3.threadtitle a.title');
                    const title = titleLink.text().trim();
                    const href = titleLink.attr('href');

                    if (!title || !href) {
                        console.warn(`${EMOJI_WARN} Skipping thread due to missing title or href on page: ${pageUrl}`);
                        continue;
                    }

                    const threadUrl = new URL(href, config.FORUM_URL).href;

                    // Author and Creation Date:  Get the entire "Started by" span content.
                    const authorDateSpan = $threadRow.find('.threadmeta .author span.label');
                    const authorDateText = authorDateSpan.text().trim();

                    // Extract Author and Date using a regular expression.  Much cleaner!
                    const authorMatch = authorDateText.match(/Started by\s*<a[^>]*>(.*?)<\/a>,\s*(.*)/) ||  authorDateText.match(/Started by\s*([^,]*),\s*(.*)/);

                    let creator = "Unknown";
                    let createdAt = new Date().toISOString();

                    if (authorMatch) {
                        creator = authorMatch[1].trim();
                        createdAt = authorMatch[2].trim();
                    }

                    insertThread(subforumUrl, title, threadUrl, creator, createdAt);
                    console.log(`${EMOJI_SUCCESS} Added thread: ${title} (${createdAt}) by ${creator}`);
                    stats.threads++;

                    await delay(config.DELAY_BETWEEN_REQUESTS);

                } catch (error: any) {
                    console.error(`${EMOJI_ERROR} Failed to process thread on page ${pageUrl}:`, error.message, error.stack);
                }
            }

            // Pagination: Find the next page link. Use the div with id that contains "-pagenav-"
            let nextLink = $('div[id*="-pagenav-"] .pagination a').last().attr('href');

             if (!nextLink) {
                //fallback
                nextLink = $('a[rel="next"]').attr('href');
            }
            pageUrl = nextLink ? new URL(nextLink, config.FORUM_URL).href : '';

            if (pageUrl) {
                await delay(config.DELAY_BETWEEN_REQUESTS);
            }
        } catch (error: any) {
            console.error(`${EMOJI_ERROR} Failed to scrape page ${pageUrl}:`, error.message, error.stack);
            break;
        }
    }
}

async function scrapeThreadPosts(threadUrl: string, allUsers: Set<string>): Promise<void> {
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

                    const userLink = $post.find('a.bigusername');
                    let userUrl = '';

                    if (userLink.length > 0) {
                      const href = userLink.attr('href');
                      if (href) {
                        userUrl = new URL(href, config.FORUM_URL).href;
                      }
                    }

                    if (username && comment && userUrl) {
                        const postId = insertPost(threadUrl, username, comment, postedAt, userUrl);

                        const imageLinks = $post.find('.postcontent img[src]');
                        for (const img of imageLinks.toArray()) {
                            const $img = $(img);
                            const src = $img.attr('src');
                            if (src) {
                                const fileUrl = new URL(src, config.FORUM_URL).href;

                                if (config.DOWNLOAD_FILES) {
                                    try {
                                        const fileResponse = await fetch(fileUrl);
                                        if (!fileResponse.ok) {
                                            console.error(`Error downloading file: ${fileUrl}`);
                                            continue;
                                        }
                                        const fileArrayBuffer = await fileResponse.arrayBuffer();
                                        const mimeType = fileResponse.headers.get('content-type');
                                        const urlObj = new URL(fileUrl);
                                        const filename = urlObj.pathname.split('/').pop() || 'unknown';

                                         if (postId) {
                                            insertFile(postId, filename, mimeType, fileArrayBuffer);
                                        }
                                    } catch (fileError) {
                                        console.error(`Error processing file ${fileUrl}:`, fileError);
                                    }
                                } else {
                                    console.log(`${EMOJI_INFO} Would have downloaded: ${fileUrl}`);
                                }
                            }
                        }
                        allUsers.add(username);
                    }

                    stats.posts++;
                    updatePercentages();
                    if (stats.posts % 100 === 0) printProgress();

                } catch (error) {
                    console.error(`${EMOJI_ERROR} Failed to process post:`, error);
                }
            }

            const nextLink = $('a[rel="next"]').attr('href');
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
    const allUsers = new Set<string>();

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

        const subforums = getSubforums();
        for (const subforum of subforums) {
            const threads = getThreadsBySubforum(subforum.url);
            for (const thread of threads) {
                await scrapeThreadPosts(thread.url, allUsers);
                await delay(config.DELAY_BETWEEN_REQUESTS);
            }
            await delay(config.SUBFORUM_DELAY);

        }

        console.log('\nFinal Statistics:');
        stats.users = allUsers.size;
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

