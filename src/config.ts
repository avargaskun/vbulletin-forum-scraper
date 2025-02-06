import * as dotenv from 'dotenv';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { type Config } from './types/types';

dotenv.config();

function getEnvVar(key: keyof Config, defaultValue: Config[keyof Config]): Config[keyof Config] {
    const value = process.env[key];

    if (value === undefined) {
        if (defaultValue === undefined) {
            console.error(`❌ ${key} is not defined in .env file and no default value is provided.`);
            process.exit(1);
        }
        return defaultValue;
    }

    switch (typeof defaultValue) {
        case 'string':
            return value;
        case 'number':
            const num = parseInt(value, 10);
            if (isNaN(num)) {
                console.error(`❌ ${key} must be a valid number.`);
                process.exit(1);
            }
            return num;
        case 'boolean':
            if (value.toLowerCase() === 'true') {
                return true;
            } else if (value.toLowerCase() === 'false') {
                return false;
            }
            console.error(`❌ ${key} must be a boolean value (true or false).`);
            process.exit(1);
        default:
             return value;

    }
}

const DATABASE_PATH = String(getEnvVar('DATABASE_PATH', 'data/forum_data.db'));
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

export const config: Config = {
    FORUM_URL: String(getEnvVar('FORUM_URL', '')),
    DATABASE_PATH,
    USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    HEADERS: { 'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" },
    DELAY_BETWEEN_REQUESTS: Number(getEnvVar('DELAY_BETWEEN_REQUESTS', 500)),
    MAX_RETRIES: Number(getEnvVar('MAX_RETRIES', 3)),
    RETRY_DELAY: Number(getEnvVar('RETRY_DELAY', 5000)),
    SUBFORUM_DELAY: Number(getEnvVar('SUBFORUM_DELAY', 10000)),
    DOWNLOAD_FILES: Boolean(getEnvVar('DOWNLOAD_FILES', false)),
};
