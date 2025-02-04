export interface Subforum {
    id: number;
    title: string;
    url: string;
}

export interface Thread {
    id: number;
    subforum_url: string;
    title: string;
    url: string;
    creator: string;
}

export interface Post {
    id: number;
    thread_url: string;
    username: string;
    comment: string;
}

export interface RawComments {
    "0": string;
    "1": string;
    length: number;
}
export interface RawUsernames {
    "0": string;
    "1": string;
    length: number;
}

export const EMOJI_SUCCESS = '✅';
export const EMOJI_ERROR = '❌';
export const EMOJI_INFO = 'ℹ️';
export const EMOJI_WARN = '⚠️';
