/**
 * YouTube Search
 * @author Snowflake107
 */

import Util from "./Util";
import Channel from "./Structures/Channel";
import Playlist from "./Structures/Playlist";
import Video from "./Structures/Video";
import Thumbnail from "./Structures/Thumbnail";

const SAFE_SEARCH_COOKIE = "PREF=f2=8000000";

export interface SearchOptions {
    limit?: number;
    type?: "video" | "channel" | "playlist" | "all";
    requestOptions?: RequestInit;
    safeSearch?: boolean;
}

export interface PlaylistOptions {
    limit?: number;
    requestOptions?: RequestInit;
}

class YouTube {
    constructor() {
        throw new Error(`The ${this.constructor.name} class may not be instantiated!`);
    }

    /**
     * Search
     * @param {string} query Search youtube
     * @param {object} options Search options
     * @param {number} [options.limit=20] Limit
     * @param {"video"|"channel"|"playlist"|"all"} options.type Type
     * @param {RequestInit} [options.requestOptions] Request options
     * @param {boolean} [options.safeSearch] Safe search filter
     */
    static async search(query: string, options?: SearchOptions & { type: "video" }): Promise<Video[]>;
    static async search(query: string, options?: SearchOptions & { type: "channel" }): Promise<Channel[]>;
    static async search(query: string, options?: SearchOptions & { type: "playlist" }): Promise<Playlist[]>;
    static async search(query: string, options?: SearchOptions & { type: "all" }): Promise<(Video | Channel | Playlist)[]>;
    static async search(query: string, options?: SearchOptions): Promise<(Video | Channel | Playlist)[]> {
        if (!options) options = { limit: 20, type: "video", requestOptions: {} };
        if (!query || typeof query !== "string") throw new Error(`Invalid search query "${query}"!`);
        options.type = options.type || "video";

        const filter = options.type === "all" ? "" : `&sp=${Util.filter(options.type)}`;

        const url = `https://youtube.com/results?q=${encodeURIComponent(query.trim()).replace(/%20/g, "+")}&hl=en${filter}`;
        const requestOptions = options.safeSearch ? { ...options.requestOptions, headers: { cookie: SAFE_SEARCH_COOKIE } } : {};

        const html = await Util.getHTML(url, requestOptions);
        return Util.parseSearchResult(html, options);
    }

    /**
     * Search one
     * @param {string} query Search query
     * @param {"video"|"channel"|"playlist"|"all"} type Search type
     * @param {boolean} safeSearch Safe search filter
     * @param {RequestInit} requestOptions Request options
     */
    static searchOne(query: string, type?: "video", safeSearch?: boolean, requestOptions?: RequestInit): Promise<Video>;
    static searchOne(query: string, type?: "channel", safeSearch?: boolean, requestOptions?: RequestInit): Promise<Channel>;
    static searchOne(query: string, type?: "playlist", safeSearch?: boolean, requestOptions?: RequestInit): Promise<Playlist>;
    static searchOne(query: string, type?: "video" | "channel" | "playlist" | "all", safeSearch?: boolean, requestOptions?: RequestInit): Promise<Video | Channel | Playlist> {
        if (!type) type = "video";
        return new Promise((resolve) => {
            // @ts-ignore
            YouTube.search(query, { limit: 1, type: type, requestOptions: requestOptions, safeSearch: Boolean(safeSearch) })
                .then((res) => {
                    if (!res || !res.length) return resolve(null);
                    resolve(res[0]);
                })
                .catch(() => {
                    resolve(null);
                });
        });
    }

    /**
     * Returns playlist details
     * @param {string} url Playlist URL
     * @param {object} [options] Options
     * @param {number} [options.limit=100] Playlist video limit
     * @param {RequestInit} [options.requestOptions] Request Options
     */
    static async getPlaylist(url: string, options?: PlaylistOptions): Promise<Playlist> {
        if (!options) options = { limit: 100, requestOptions: {} };
        if (!url || typeof url !== "string") throw new Error(`Expected playlist url, received ${typeof url}!`);
        Util.validatePlaylist(url);
        url = Util.getPlaylistURL(url);

        const html = await Util.getHTML(`${url}&hl=en`, options && options.requestOptions);
        return Util.getPlaylist(html, options && options.limit);
    }

    /**
     * Returns basic video info
     * @param url Video url to parse
     * @param requestOptions Request options
     */
    static async getVideo(url: string | Video, requestOptions?: RequestInit): Promise<Video> {
        if (!url) throw new Error("Missing video url");
        if (url instanceof Video) url = url.url;
        const isValid = YouTube.validate(url, "VIDEO");
        if (!isValid) throw new Error("Invalid video url");

        const html = await Util.getHTML(`${url}&hl=en`, requestOptions);
        return Util.getVideo(html);
    }

    /**
     * Fetches homepage videos
     */
    static async homepage(): Promise<Video[]> {
        const html = await Util.getHTML("https://www.youtube.com?hl=en");
        return Util.parseHomepage(html);
    }

    /**
     * Attempts to parse `INNERTUBE_API_KEY`
     */
    static async fetchInnerTubeKey() {
        const html = await Util.getHTML("https://www.youtube.com?hl=en");
        const key = html.split('INNERTUBE_API_KEY":"')[1]?.split('"')[0] ?? html.split('innertubeApiKey":"')[1]?.split('"')[0];
        return key ?? null;
    }

    static async trending(): Promise<Video[]> {
        const html = await Util.getHTML("https://www.youtube.com/feed/explore?hl=en");
        let json;

        try {
            json = JSON.parse(html.split("var ytInitialData =")[1].split(";")[0]);
        } catch {
            return null;
        }

        const content = json.contents?.twoColumnBrowseResultsRenderer?.tabs[0].tabRenderer?.content?.sectionListRenderer?.contents[1]?.itemSectionRenderer?.contents[0]?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items;
        if (!content || !Array.isArray(content)) return null;

        const res: Video[] = [];

        for (const item of content.map((m) => m.videoRenderer)) {
            res.push(
                new Video({
                    title: item.title.runs[0].text,
                    id: item.videoId,
                    url: `https://www.youtube.com/watch?v=${item.videoId}`,
                    description: item.descriptionSnippet?.runs[0]?.text,
                    duration: Util.parseDuration(item.lengthText.simpleText) / 1000 || 0,
                    duration_raw: item.lengthText.simpleText,
                    thumbnail: {
                        id: item.videoId,
                        url: item.thumbnail.thumbnails[item.thumbnail.thumbnails.length - 1].url,
                        height: item.thumbnail.thumbnails[item.thumbnail.thumbnails.length - 1].height,
                        width: item.thumbnail.thumbnails[item.thumbnail.thumbnails.length - 1].width
                    },
                    channel: {
                        id: item.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
                        name: item.ownerText.runs[0].text,
                        url: `https://www.youtube.com${item.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl}`,
                        icon: {
                            url: null,
                            width: 0,
                            height: 0
                        },
                        verified: item.ownerBadges ? Boolean(item.ownerBadges[0].metadataBadgeRenderer.tooltip === "Verified") : false
                    },
                    uploadedAt: item.publishedTimeText.simpleText,
                    views: item.viewCountText.simpleText.replace(/[^0-9]/g, "") || 0
                })
            );
        }

        return res;
    }

    static async getSuggestions(query: string) {
        if (!query) throw new Error("Search query was not provided!");

        const res = await Util.getHTML(`https://clients1.google.com/complete/search?client=youtube&gs_ri=youtube&ds=yt&q=${encodeURIComponent(query)}`);
        const searchSuggestions: string[] = [];
        res.split("[").forEach((ele, index) => {
            if (!ele.split('"')[1] || index === 1) return;
            return searchSuggestions.push(ele.split('"')[1]);
        });

        searchSuggestions.pop();
        return searchSuggestions;
    }

    /**
     * Validates playlist
     * @param {string} url Playlist id or url/video id or url to validate
     * @param {"VIDEO"|"VIDEO_ID"|"PLAYLIST"|"PLAYLIST_ID"} type URL validation type
     * @returns {boolean}
     */
    static validate(url: string, type?: "VIDEO" | "VIDEO_ID" | "PLAYLIST" | "PLAYLIST_ID"): boolean {
        if (typeof url !== "string") return false;
        if (!type) type = "PLAYLIST";
        switch (type) {
            case "PLAYLIST":
                return YouTube.Regex.PLAYLIST_URL.test(url);
            case "PLAYLIST_ID":
                return YouTube.Regex.PLAYLIST_ID.test(url);
            case "VIDEO":
                return YouTube.Regex.VIDEO_URL.test(url);
            case "VIDEO_ID":
                return YouTube.Regex.VIDEO_ID.test(url);
            default:
                return false;
        }
    }

    static isPlaylist(src: string) {
        try {
            Util.validatePlaylist(src);
            return true;
        } catch {
            return false;
        }
    }

    static get Regex() {
        return {
            PLAYLIST_URL: Util.PlaylistURLRegex,
            PLAYLIST_ID: Util.PlaylistIDRegex,
            VIDEO_ID: Util.VideoIDRegex,
            VIDEO_URL: Util.VideoRegex
        };
    }
}

export { Util, Thumbnail, Channel, Playlist, Video, YouTube };

export default YouTube;
