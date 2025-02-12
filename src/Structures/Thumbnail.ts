type ThumbnailType = "default" | "hqdefault" | "mqdefault" | "sddefault" | "maxresdefault" | "ultrares";
class Thumbnail {
    id?: string;
    width: number;
    height: number;
    url?: string;

    /**
     * Thumbnail constructor
     * @param data Thumbnail constructor params
     */
    constructor(data: any) {
        if (!data) throw new Error(`Cannot instantiate the ${this.constructor.name} class without data!`);

        this._patch(data);
    }

    /**
     * Patch raw data
     * @param data Raw Data
     * @private
     * @ignore
     */
    private _patch(data: any) {
        if (!data) data = {};

        this.id = data.id || null;
        this.width = data.width || 0;
        this.height = data.height || 0;
        this.url = data.url || null;
    }

    /**
     * Returns thumbnail url
     * @param {"default"|"hqdefault"|"mqdefault"|"sddefault"|"maxresdefault"|"ultrares"} thumbnailType Thumbnail type
     */
    displayThumbnailURL(thumbnailType: ThumbnailType = "ultrares"): string {
        if (!["default", "hqdefault", "mqdefault", "sddefault", "maxresdefault", "ultrares"].includes(thumbnailType)) throw new Error(`Invalid thumbnail type "${thumbnailType}"!`);
        if (thumbnailType === "ultrares") return this.url;
        return `https://i3.ytimg.com/vi/${this.id}/${thumbnailType}.jpg`;
    }

    /**
     * Returns default thumbnail
     * @param {"0"|"1"|"2"|"3"|"4"} id Thumbnail id. **4 returns thumbnail placeholder.**
     */
    defaultThumbnailURL(id: "0" | "1" | "2" | "3" | "4"): string {
        if (!id) id = "0";
        if (!["0", "1", "2", "3", "4"].includes(id)) throw new Error(`Invalid thumbnail id "${id}"!`);
        return `https://i3.ytimg.com/vi/${this.id}/${id}.jpg`;
    }

    toString(): string {
        return this.url ? `${this.url}` : "";
    }

    toJSON() {
        return {
            id: this.id,
            width: this.width,
            height: this.height,
            url: this.url
        };
    }
}

export default Thumbnail;
