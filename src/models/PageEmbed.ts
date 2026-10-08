export interface EmbedItem {
    title: string;
    body: string;
}

export type LastEmbedType = 'pages' | 'galleries' | 'images' | 'videos' | 'audio' | 'documents';
export type HeroEmbedType = 'image' | 'video' | 'carousel';
export type HeroTransition = 'fade' | 'slide';

export interface PageEmbed {
    type: string;
    embed_id?: number;
    hero_type?: HeroEmbedType;
    hero_duration?: number;
    hero_transition?: HeroTransition;
    identifier?: string;
    word_cloud_options?: Record<string, unknown>;
    today_random_options?: Record<string, unknown>;
    placeholder?: string;
    autoplay?: boolean;
    dot_duration?: boolean;
    speed?: number;
    /** Inline items for collapse/carousel embeds (new JSON format) */
    items?: EmbedItem[];
    youtube_url?: string;
    last_type?: LastEmbedType;
    count?: number;
}