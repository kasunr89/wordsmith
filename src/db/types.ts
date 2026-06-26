export interface Word {
    id: number;
    word: string;
    english: string | null;
    genitive: string | null;
    partitive: string | null;
    example: string | null;
    topic: string | null;
    ease: number | null;
    due_date: string | null;
    created_at: string;
}
