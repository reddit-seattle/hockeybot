import { MEDIA_FORMAT } from "../../../utils/constants";

export module GameContentResponse {

    export interface Token {
        id: string;
        teamId: string;
        position: string;
        name: string;
        seoName: string;
        tokenGUID: string;
        type: string;
        videoId: string;
        href: string;
        tags: Tag[];
        date: Date;
        headline: string;
        duration: string;
        blurb: string;
        bigBlurb: string;
        mediaPlaybackId: string;
        image: Image;
        mediaURLS: {[resolution: string]: string};
    }

    export interface Tag {
        "@type": string;
        "@value": string;
        "@displayName": string;
    }

    export interface ContributorObj {
        name: string;
        twitter: string;
    }

    export interface Contributor {
        contributors: ContributorObj[];
        source: string;
    }

    export interface KeywordsDisplay {
        type: string;
        value: string;
        displayName: string;
    }

    export interface KeywordsAll {
        type: string;
        value: string;
        displayName: string;
    }

    export interface PrimaryKeyword {
        type: string;
        value: string;
        displayName: string;
    }

    export interface Cut {
        aspectRatio: string;
        width: number;
        height: number;
        src: string;
        at2x: string;
        at3x: string;
    }

    export interface Image {
        title: string;
        altText: string;
        cuts: { [id: string]: Cut };
    }

    export interface Media {
        type: string;
        image: Image;
    }
    export interface GameMedia {
        epg: Epg[];
        milestones: Milestones;
    }

    export interface Milestones {
        title: string;
        streamStart: Date;
        items: Item[];
    }

    export interface Epg {
        title: string;
        platform: string;
        items: Item[];
        topicList: string;
    }

    export interface Item {
        title: string;
        blurb: string;
        description: string;
        duration: string;
        authFlow: boolean;
        mediaPlaybackId: string;
        mediaState: string;
        keywords: Keyword[];
        image: Image;
        playbacks: Playback[];
        highlight: Item;
        type: string;
        state: string;
        date: Date;
        id: string;
        headline: string;
        subhead: string;
        seoTitle: string;
        seoDescription: string;
        seoKeywords: string;
        slug: string;
        commenting: boolean;
        tagline: string;
        tokenData: { [id: string]: Token}
        contributor: Contributor;
        keywordsDisplay: KeywordsDisplay[];
        keywordsAll: KeywordsAll[];
        approval: string;
        url: string;
        dataURI: string;
        primaryKeyword: PrimaryKeyword;
        shareImage: string;
        media: Media;
        statsEventId: string;
        preview: string;
    }

    export interface Preview {
        title: string;
        topicList: string;
        items: Item[];
    }

    export interface Articles {
        title: string;
        topicList: string;
        items: any[];
    }

    export interface Keyword {
        type: string;
        value: string;
        displayName: string;
    }

    export interface Playback {
        name: MEDIA_FORMAT;
        width: string;
        height: string;
        url: string;
    }

    export interface Recap {
        title: string;
        topicList: string;
        items: Item[];
    }

    export interface Editorial {
        preview: Preview;
        articles: Articles;
        recap: Recap;
    }

    export interface Response {
        copyright: string;
        link: string;
        editorial: Editorial;
        highlights: Highlights;
        media: GameMedia;
    }

    export interface Highlights {
        scoreboard: Scoreboard;
        gameCenter: GameCenter;
    }

    export interface GameCenter {
        title: string;
        topicList: string;
        items: Item[];
    }

    export interface Scoreboard {
        title: string;
        topicList: string;
        items: Item[];
    }

}