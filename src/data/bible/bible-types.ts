export interface BibleBook {
    id: string;
    name: string;
    testament: 'old' | 'new';
    chapters: number;
    abbrev: string;
}

export interface BibleVerse {
    number: number;
    text: string;
}

export interface BibleChapter {
    bookId: string;
    chapter: number;
    verses: BibleVerse[];
}

// Interface para o formato do JSON fonte (thiagobodruk/biblia)
export interface BibleBookData {
    abbrev: string;
    chapters: string[][];
}

export const BIBLE_BOOKS: BibleBook[] = [
    { id: 'gn', name: 'Gênesis', testament: 'old', chapters: 50, abbrev: 'Gn' },
    { id: 'ex', name: 'Êxodo', testament: 'old', chapters: 40, abbrev: 'Êx' },
    { id: 'lv', name: 'Levítico', testament: 'old', chapters: 27, abbrev: 'Lv' },
    { id: 'nm', name: 'Números', testament: 'old', chapters: 36, abbrev: 'Nm' },
    { id: 'dt', name: 'Deuteronômio', testament: 'old', chapters: 34, abbrev: 'Dt' },
    { id: 'js', name: 'Josué', testament: 'old', chapters: 24, abbrev: 'Js' },
    { id: 'jz', name: 'Juízes', testament: 'old', chapters: 21, abbrev: 'Jz' },
    { id: 'rt', name: 'Rute', testament: 'old', chapters: 4, abbrev: 'Rt' },
    { id: '1sm', name: '1 Samuel', testament: 'old', chapters: 31, abbrev: '1Sm' },
    { id: '2sm', name: '2 Samuel', testament: 'old', chapters: 24, abbrev: '2Sm' },
    { id: '1rs', name: '1 Reis', testament: 'old', chapters: 22, abbrev: '1Rs' },
    { id: '2rs', name: '2 Reis', testament: 'old', chapters: 25, abbrev: '2Rs' },
    { id: '1cr', name: '1 Crônicas', testament: 'old', chapters: 29, abbrev: '1Cr' },
    { id: '2cr', name: '2 Crônicas', testament: 'old', chapters: 36, abbrev: '2Cr' },
    { id: 'ed', name: 'Esdras', testament: 'old', chapters: 10, abbrev: 'Ed' },
    { id: 'ne', name: 'Neemias', testament: 'old', chapters: 13, abbrev: 'Ne' },
    { id: 'et', name: 'Ester', testament: 'old', chapters: 10, abbrev: 'Et' },
    { id: 'job', name: 'Jó', testament: 'old', chapters: 42, abbrev: 'Jó' },
    { id: 'sl', name: 'Salmos', testament: 'old', chapters: 150, abbrev: 'Sl' },
    { id: 'pv', name: 'Provérbios', testament: 'old', chapters: 31, abbrev: 'Pv' },
    { id: 'ec', name: 'Eclesiastes', testament: 'old', chapters: 12, abbrev: 'Ec' },
    { id: 'ct', name: 'Cânticos', testament: 'old', chapters: 8, abbrev: 'Ct' },
    { id: 'is', name: 'Isaías', testament: 'old', chapters: 66, abbrev: 'Is' },
    { id: 'jr', name: 'Jeremias', testament: 'old', chapters: 52, abbrev: 'Jr' },
    { id: 'lm', name: 'Lamentações', testament: 'old', chapters: 5, abbrev: 'Lm' },
    { id: 'ez', name: 'Ezequiel', testament: 'old', chapters: 48, abbrev: 'Ez' },
    { id: 'dn', name: 'Daniel', testament: 'old', chapters: 12, abbrev: 'Dn' },
    { id: 'os', name: 'Oséias', testament: 'old', chapters: 14, abbrev: 'Os' },
    { id: 'jl', name: 'Joel', testament: 'old', chapters: 3, abbrev: 'Jl' },
    { id: 'am', name: 'Amós', testament: 'old', chapters: 9, abbrev: 'Am' },
    { id: 'ob', name: 'Obadias', testament: 'old', chapters: 1, abbrev: 'Ob' },
    { id: 'jn', name: 'Jonas', testament: 'old', chapters: 4, abbrev: 'Jn' },
    { id: 'mq', name: 'Miquéias', testament: 'old', chapters: 7, abbrev: 'Mq' },
    { id: 'na', name: 'Naum', testament: 'old', chapters: 3, abbrev: 'Na' },
    { id: 'hc', name: 'Habacuque', testament: 'old', chapters: 3, abbrev: 'Hc' },
    { id: 'sf', name: 'Sofonias', testament: 'old', chapters: 3, abbrev: 'Sf' },
    { id: 'ag', name: 'Ageu', testament: 'old', chapters: 2, abbrev: 'Ag' },
    { id: 'zc', name: 'Zacarias', testament: 'old', chapters: 14, abbrev: 'Zc' },
    { id: 'ml', name: 'Malaquias', testament: 'old', chapters: 4, abbrev: 'Ml' },
    // New Testament
    { id: 'mt', name: 'Mateus', testament: 'new', chapters: 28, abbrev: 'Mt' },
    { id: 'mc', name: 'Marcos', testament: 'new', chapters: 16, abbrev: 'Mc' },
    { id: 'lc', name: 'Lucas', testament: 'new', chapters: 24, abbrev: 'Lc' },
    { id: 'jo', name: 'João', testament: 'new', chapters: 21, abbrev: 'Jo' },
    { id: 'at', name: 'Atos', testament: 'new', chapters: 28, abbrev: 'At' },
    { id: 'rm', name: 'Romanos', testament: 'new', chapters: 16, abbrev: 'Rm' },
    { id: '1co', name: '1 Coríntios', testament: 'new', chapters: 16, abbrev: '1Co' },
    { id: '2co', name: '2 Coríntios', testament: 'new', chapters: 13, abbrev: '2Co' },
    { id: 'gl', name: 'Gálatas', testament: 'new', chapters: 6, abbrev: 'Gl' },
    { id: 'ef', name: 'Efésios', testament: 'new', chapters: 6, abbrev: 'Ef' },
    { id: 'fp', name: 'Filipenses', testament: 'new', chapters: 4, abbrev: 'Fp' },
    { id: 'cl', name: 'Colossenses', testament: 'new', chapters: 4, abbrev: 'Cl' },
    { id: '1ts', name: '1 Tessalonicenses', testament: 'new', chapters: 5, abbrev: '1Ts' },
    { id: '2ts', name: '2 Tessalonicenses', testament: 'new', chapters: 3, abbrev: '2Ts' },
    { id: '1tm', name: '1 Timóteo', testament: 'new', chapters: 6, abbrev: '1Tm' },
    { id: '2tm', name: '2 Timóteo', testament: 'new', chapters: 4, abbrev: '2Tm' },
    { id: 'tt', name: 'Tito', testament: 'new', chapters: 3, abbrev: 'Tt' },
    { id: 'fm', name: 'Filemom', testament: 'new', chapters: 1, abbrev: 'Fm' },
    { id: 'hb', name: 'Hebreus', testament: 'new', chapters: 13, abbrev: 'Hb' },
    { id: 'tg', name: 'Tiago', testament: 'new', chapters: 5, abbrev: 'Tg' },
    { id: '1pe', name: '1 Pedro', testament: 'new', chapters: 5, abbrev: '1Pe' },
    { id: '2pe', name: '2 Pedro', testament: 'new', chapters: 3, abbrev: '2Pe' },
    { id: '1jo', name: '1 João', testament: 'new', chapters: 5, abbrev: '1Jo' },
    { id: '2jo', name: '2 João', testament: 'new', chapters: 1, abbrev: '2Jo' },
    { id: '3jo', name: '3 João', testament: 'new', chapters: 1, abbrev: '3Jo' },
    { id: 'jd', name: 'Judas', testament: 'new', chapters: 1, abbrev: 'Jd' },
    { id: 'ap', name: 'Apocalipse', testament: 'new', chapters: 22, abbrev: 'Ap' },
];

// Importa os dados das Bíblias
import nviData from './nvi.json';
import naaData from './naa.json';

// Tipos de versões disponíveis
export type BibleVersion = 'NVI' | 'NAA' | 'KJA';

export interface BibleVersionInfo {
    id: BibleVersion;
    name: string;
    fullName: string;
    available: boolean;
}

export const BIBLE_VERSIONS: BibleVersionInfo[] = [
    { id: 'NVI', name: 'NVI', fullName: 'Nova Versão Internacional', available: true },
    { id: 'NAA', name: 'NAA', fullName: 'Nova Almeida Atualizada', available: true },
    { id: 'KJA', name: 'KJA', fullName: 'King James Atualizada', available: true },
];

// Cache para os dados das versões
const bibleDataCache: Record<string, BibleBookData[]> = {
    NVI: nviData as BibleBookData[],
    NAA: naaData as BibleBookData[],
};

// Lazy load KJA quando disponível
let kjaLoaded = false;
async function loadKJA() {
    if (!kjaLoaded && !bibleDataCache['KJA']) {
        try {
            const kjaData = await import('./kja.json');
            bibleDataCache['KJA'] = kjaData.default as BibleBookData[];
            kjaLoaded = true;
            // Update availability
            const kjaVersion = BIBLE_VERSIONS.find(v => v.id === 'KJA');
            if (kjaVersion) kjaVersion.available = true;
        } catch {
            console.log('KJA not available yet');
        }
    }
}

// Try to load KJA on init
loadKJA();

/**
 * Busca um capítulo específico da Bíblia
 */
export function getChapter(bookId: string, chapterNumber: number, version: BibleVersion = 'NVI'): BibleChapter | null {
    const bookIndex = BIBLE_BOOKS.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return null;

    const bibleData = bibleDataCache[version];
    if (!bibleData) return null;

    const bookData = bibleData[bookIndex];
    if (!bookData || chapterNumber < 1 || chapterNumber > bookData.chapters.length) {
        return null;
    }

    const verses = bookData.chapters[chapterNumber - 1].map((text, index) => ({
        number: index + 1,
        text
    }));

    return {
        bookId,
        chapter: chapterNumber,
        verses
    };
}

/**
 * Retorna as versões disponíveis
 */
export function getAvailableVersions(): BibleVersionInfo[] {
    // Refresh KJA availability
    loadKJA();
    return BIBLE_VERSIONS.filter(v => v.available || bibleDataCache[v.id]);
}
