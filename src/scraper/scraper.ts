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
    type ForumStats,
    type Subforum
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

async function scrapeSubforums(url: string = config.FORUM_URL, parentId: number | null = null): Promise<void> {
    if (config.TEST_MODE && stats.subforums >= (config.MAX_SUBFORUMS ?? Infinity)) {
        return;
    }

    const html = await fetchWithRetry(url);
    if (!html) {
        console.error(`${EMOJI_ERROR} Failed to fetch forum HTML from ${url}.`);
        return;
    }
    const $ = cheerio.load(html);

    // *** CORRECTED SELECTOR ***
    const subforumListItems = $('ol#forums > li.forumbit_nopost > ol.childforum > li.forumbit_post h2.forumtitle > a');

    console.log(`${EMOJI_INFO} Found ${subforumListItems.length} subforums/child forums on ${url}`);

    for (const element of subforumListItems.toArray()) {
        // ... (rest of the function remains the same) ...
         if (config.TEST_MODE && stats.subforums >= (config.MAX_SUBFORUMS ?? Infinity)) {
            return;
        }

        const $listItem = $(element);
		//The link is the element now. No need to find
        const $link = $listItem;
        const title = $link.text().trim();
        let href = $link.attr('href');

        if (!title || !href) {
            console.log(`${EMOJI_WARN} Invalid forum title or href on ${url}`);
            continue;
        }

        const subforumUrl = new URL(href, url).href;

        let subforumRecord: Subforum;
        try {
            subforumRecord = await insertSubforum(title, subforumUrl, parentId);
            console.log(`${EMOJI_SUCCESS} Added subforum: ${title} with parentId ${parentId}`);
            stats.subforums++;
        } catch (error) {
            console.error(`${EMOJI_ERROR} Failed to insert subforum ${title}:`, error);
            continue;
        }

        try {
           await scrapeSubforumThreads(subforumUrl);
           await delay(config.SUBFORUM_DELAY);
        } catch(error){
            console.error(`${EMOJI_ERROR} Failed to scrape subforum threads.`, error)
        }

        await scrapeSubforums(subforumUrl, subforumRecord.id);
    }
}

async function scrapeSubforumThreads(subforumUrl: string): Promise<void> {
    let pageUrl: string = subforumUrl;
    let pageCount = 0;

    while (pageUrl) {
        if (config.TEST_MODE && pageCount >= (config.MAX_PAGES_PER_SUBFORUM ?? Infinity)) {
            return;
        }
        try {
            const html = await fetchWithRetry(pageUrl);
            if (!html) {
                console.error(`${EMOJI_ERROR} Failed to fetch subforum HTML: ${pageUrl}`);
                return;
            }
            const $ = cheerio.load(html);

            const threadRows = $("#threads > li.threadbit");

            console.log(`${EMOJI_INFO} Found ${threadRows.length} threads on page: ${pageUrl}`);
            stats.pagesProcessed++;
            pageCount++;

            let threadCount = 0;
            for (const threadRow of threadRows.toArray()) {
                if (config.TEST_MODE && threadCount >= (config.MAX_THREADS_PER_SUBFORUM ?? Infinity)) {
                    break;
                }
                try {
                    const $threadRow = $(threadRow);

                    const titleLink = $threadRow.find('h3.threadtitle a.title');
                    const title = titleLink.text().trim();
                    const href = titleLink.attr('href');

                    if (!title || !href) {
                        console.warn(`${EMOJI_WARN} Skipping thread due to missing title or href on page: ${pageUrl}`);
                        continue;
                    }

                    const threadUrl = new URL(href, config.FORUM_URL).href;

                    const authorDateSpan = $threadRow.find('.threadmeta .author span.label');
                    const authorDateText = authorDateSpan.text().trim();

                    const authorMatch = authorDateText.match(/Started by\s*<a[^>]*>(.*?)<\/a>,\s*(.*)/) || authorDateText.match(/Started by\s*([^,]*),\s*(.*)/);

                    let creator = "Unknown";
                    let createdAt = new Date().toISOString();

                    if (authorMatch) {
                        creator = authorMatch[1].trim();
                        createdAt = authorMatch[2].trim();
                    }

                    insertThread(subforumUrl, title, threadUrl, creator, createdAt);
                    console.log(`${EMOJI_SUCCESS} Added thread: ${title} (${createdAt}) by ${creator}`);
                    stats.threads++;
                    threadCount++;

                    await delay(config.DELAY_BETWEEN_REQUESTS);

                } catch (error: any) {
                    console.error(`${EMOJI_ERROR} Failed to process thread on page ${pageUrl}:`, error.message, error.stack);
                }
            }

            let nextLink = $('div[id*="-pagenav-"] .pagination a').last().attr('href');

             if (!nextLink) {
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
    let pageCount = 0;

    while (pageUrl) {
        if(config.TEST_MODE && pageCount >= (config.MAX_PAGES_PER_THREAD ?? Infinity)) {
          return;
        }
        try {
            const html = await fetchWithRetry(pageUrl);
            const $ = cheerio.load(html);
            const posts = $('li.postcontainer'); 

            console.log(`${EMOJI_INFO} Found ${posts.length} posts on page ${pageUrl}`);
            pageCount++;

            let postCount = 0;
            for (const post of posts) {
              if (config.TEST_MODE && postCount >= (config.MAX_POSTS_PER_THREAD ?? Infinity)) {
                    break;
                }
                try {
                    const $post = $(post);

                    const usernameElement = $post.find('.username strong');
                    const username = usernameElement.text().trim();
                    const userUrl =  new URL($post.find('a.username').attr('href') || '', config.FORUM_URL).href;
                    const comment = $post.find('div[id^="post_message_"] blockquote.postcontent').text().trim();
                    const postedAt = $post.find('div.posthead span.postdate span.date').text().trim() || new Date().toISOString();


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
                    postCount++;
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
     if (config.TEST_MODE) {
        console.warn(`${EMOJI_WARN} TEST_MODE is enabled.  Scraping will be limited.`);
        console.warn(`${EMOJI_WARN} Max Subforums: ${config.MAX_SUBFORUMS ?? 'Unlimited'}`);
        console.warn(`${EMOJI_WARN} Max Threads per Subforum: ${config.MAX_THREADS_PER_SUBFORUM ?? 'Unlimited'}`);
        console.warn(`${EMOJI_WARN} Max Posts per Thread: ${config.MAX_POSTS_PER_THREAD ?? 'Unlimited'}`);
        console.warn(`${EMOJI_WARN} Max Pages per Subforum: ${config.MAX_PAGES_PER_SUBFORUM ?? 'Unlimited'}`);
        console.warn(`${EMOJI_WARN} Max Pages per Thread: ${config.MAX_PAGES_PER_THREAD ?? 'Unlimited'}`);
    }
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

        const subforums = await getSubforums();
        for (const subforum of subforums) {
            const threads = await getThreadsBySubforum(subforum.url);
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
