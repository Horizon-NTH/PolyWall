export type RssFeedItem = {
    title: string;
    link: string | null;
    date: string | null;
    summary: string | null;
};

export type RssFeedResult = {
    title: string | null;
    items: RssFeedItem[];
    fetchedAt: string;
};
