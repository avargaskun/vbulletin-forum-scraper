import * as dotenv from 'dotenv';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

dotenv.config();

// Validate and create database directory if it doesn't exist
const DATABASE_PATH = process.env.DATABASE_PATH || 'data/forum_data.db';
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

// Basic configuration
const FORUM_URL = process.env.FORUM_URL;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// Rate limiting configuration with defaults
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS || '500');
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3');
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || '5000');
const SUBFORUM_DELAY = parseInt(process.env.SUBFORUM_DELAY || '10000');

// Validate required configuration
if (!FORUM_URL) {
    console.error('❌ FORUM_URL is not defined in .env file');
    process.exit(1);
}

// Validate numeric configurations
if (isNaN(DELAY_BETWEEN_REQUESTS) || isNaN(MAX_RETRIES) ||
    isNaN(RETRY_DELAY) || isNaN(SUBFORUM_DELAY)) {
    console.error('❌ Invalid timing configuration in .env file');
    process.exit(1);
}

// Validate reasonable values
if (DELAY_BETWEEN_REQUESTS < 0 || MAX_RETRIES < 1 ||
    RETRY_DELAY < 0 || SUBFORUM_DELAY < 0) {
    console.error('❌ Invalid timing values in .env file');
    process.exit(1);
}

export const config = {
    FORUM_URL,
    DATABASE_PATH,
    USER_AGENT,
    HEADERS: { 'User-Agent': USER_AGENT },
    DELAY_BETWEEN_REQUESTS,
    MAX_RETRIES,
    RETRY_DELAY,
    SUBFORUM_DELAY
} as const;
