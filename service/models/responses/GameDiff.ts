export module GameDiffResponse {
    export interface Diff {
        op: string;
        path: string;
        value?: any;
    }
    export interface DiffContainer {
        diff: Diff[];
    }
    export interface Response extends Array<DiffContainer>{};
}