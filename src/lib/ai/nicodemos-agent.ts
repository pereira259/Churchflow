const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

if (!GROQ_API_KEY) {
    const keys = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
    const status = GROQ_API_KEY ? 'Present' : 'FALSEY';
    throw new Error(`MISSING CONFIG: VITE_GROQ_API_KEY. Detected Keys: [${keys.join(', ')}]. Status: ${status}`);
}

export interface StudyVerse {
    reference: string;
    relevance: string;
}

export interface KeyTerm {
    original: string;
    transliteration: string;
    language: string;
    meaning: string;
}

export interface NicodemusResponse {
    answer: string;
    verses: StudyVerse[];
    keyTerms: KeyTerm[];
    suggestedQuestions: string[];
    model: string;
    fromCache?: boolean;
}

// ---------- CACHE (v5) ----------

const CACHE_VERSION = 6;

function hashQuestion(text: string): string {
    const normalized = text.toLowerCase().trim()
        .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, '')
        .replace(/\s+/g, ' ');
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `nic_v${CACHE_VERSION}_${Math.abs(hash).toString(36)}`;
}

const memoryCache = new Map<string, { data: NicodemusResponse; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

function getCachedResponse(question: string): NicodemusResponse | null {
    const key = hashQuestion(question);
    const cached = memoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return { ...cached.data, fromCache: true };
    }
    return null;
}

function setCachedResponse(question: string, response: NicodemusResponse): void {
    const key = hashQuestion(question);
    memoryCache.set(key, { data: response, timestamp: Date.now() });
    if (memoryCache.size > 200) {
        const firstKey = memoryCache.keys().next().value;
        if (firstKey) memoryCache.delete(firstKey);
    }
}

// ---------- QUESTION TYPE DETECTION ----------

type QuestionType = 'greeting' | 'structural' | 'exegetical' | 'simple';

function detectQuestionType(message: string): QuestionType {
    const lower = message.toLowerCase().trim();

    // Greetings
    if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite|shalom|paz|hey|hello|hi)\b/i.test(lower) && lower.split(/\s+/).length <= 5) {
        return 'greeting';
    }

    // Structural / panorama questions
    if (/estrutura|panorama|divis[aã]o|outline|resumo do livro|vis[aã]o geral|seç[oõ]es|como .+ é organizado/i.test(lower)) {
        return 'structural';
    }

    // Exegetical - specific verse, meaning, original language
    if (/\d+[.:]\d+|vers[ií]culo|expli(que|car)|signific|grego|hebr|original|exeg|traduz|palavra/i.test(lower)) {
        return 'exegetical';
    }

    return 'simple';
}

// ---------- POST-PROCESSING ----------

function fixMarkdownLineBreaks(text: string): string {
    let fixed = text;

    // Fix ### headers: ensure newlines before and after
    fixed = fixed.replace(/([^\n])(\s*###\s)/g, '$1\n\n### ');
    fixed = fixed.replace(/(###[^\n]+)\n(?![\n])/g, '$1\n\n');

    // Smart paragraph breaks for dense exegetical text:
    // Break BEFORE sentences that introduce a verse citation
    fixed = fixed.replace(/([.!?'"]) ((?:O vers[ií]culo|Em |No vers[ií]culo|Ele diz|Jesus diz|Paulo (?:diz|escreve|afirma)|O texto diz|A passagem|Este vers[ií]culo|Esse vers[ií]culo|Aqui,|Neste))/g, '$1\n\n$2');

    // Break BEFORE sentences that introduce original language analysis
    fixed = fixed.replace(/([.!?'"]) ((?:A palavra|O termo|No grego|No hebraico|Em grego|Em hebraico|A express[aã]o|O verbo|O substantivo))/g, '$1\n\n$2');

    // Break BEFORE sentences with theological significance / application
    fixed = fixed.replace(/([.!?'"]) ((?:Isso (?:significa|nos|revela|mostra|implica|aponta)|Essa (?:verdade|passagem|palavra|ideia)|Teologicamente|Na pr[aá]tica|Para n[oó]s|Portanto|Assim|Desse modo|É importante notar|Vale destacar|Essa [eé] a|Este [eé] o))/g, '$1\n\n$2');

    // Clean up excessive newlines
    fixed = fixed.replace(/\n{3,}/g, '\n\n');
    return fixed.trim();
}

function validateKeyTerms(terms: unknown[]): KeyTerm[] {
    if (!Array.isArray(terms)) return [];
    return terms.filter((t): t is KeyTerm => {
        if (!t || typeof t !== 'object') return false;
        const term = t as Record<string, unknown>;
        return (
            typeof term.original === 'string' && term.original.length > 0 &&
            typeof term.transliteration === 'string' && term.transliteration.length > 0 &&
            typeof term.language === 'string' && term.language.length > 0 &&
            typeof term.meaning === 'string' && term.meaning.length > 0
        );
    });
}

function validateVerses(verses: unknown[]): StudyVerse[] {
    if (!Array.isArray(verses)) return [];
    return verses.filter((v): v is StudyVerse => {
        if (!v || typeof v !== 'object') return false;
        const verse = v as Record<string, unknown>;
        return (
            typeof verse.reference === 'string' && verse.reference.length > 0 &&
            typeof verse.relevance === 'string' && verse.relevance.length > 0
        );
    });
}

// ---------- SYSTEM PROMPT ----------

function buildSystemPrompt(questionType: QuestionType): string {
    const base = `Você é Nicodemos IA, teólogo bíblico do ChurchFlow. Fale como professor de seminário: profundo, preciso, caloroso.

# FORMATO

SAUDAÇÕES: MÁXIMO 1 frase. Ex: "Shalom! O que vamos estudar hoje?"

PERGUNTAS EXEGÉTICAS (versículos, significados, termos):
- SEPARE a resposta em 2-4 PARÁGRAFOS DISTINTOS (com \n\n entre eles no JSON)
- Parágrafo 1: Citação do versículo e contexto imediato
- Parágrafo 2: Análise de termos no idioma original
- Parágrafo 3: Significado teológico e conexões bíblicas
- Parágrafo 4 (opcional): Reflexão ou aplicação (1-2 frases)
- NUNCA escreva tudo em 1 parágrafo só. Cada aspecto da análise DEVE ser um parágrafo separado.
- Cite versículos em negrito: **Mateus 1:1**
- Termos: *transliteração* (caracteres) — "significado"

PERGUNTAS SOBRE ESTRUTURA/PANORAMA DE LIVROS:
- Use ### cabeçalhos para cada seção (CADA ### EM SUA PRÓPRIA LINHA)
- Linha em branco antes e depois de cada ### cabeçalho
- Formato: referência + descrição

PERGUNTAS SIMPLES: 1-2 parágrafos.

# JSON
Responda SEMPRE em JSON válido:
{
  "answer": "texto com markdown",
  "verses": [{"reference": "Ref", "relevance": "Descrição"}],
  "keyTerms": [{"original": "γένεσις", "transliteration": "genesis", "language": "Grego", "meaning": "origem, geração"}],
  "suggestedQuestions": ["pergunta"]
}`;

    const typeRules: Record<QuestionType, string> = {
        greeting: `
TIPO DE PERGUNTA DETECTADO: SAUDAÇÃO
- answer: Apenas 1 frase curta de saudação
- keyTerms: [] (vazio)
- verses: [] (vazio)
- suggestedQuestions: 2-3 sugestões de temas de estudo`,

        structural: `
TIPO DE PERGUNTA DETECTADO: ESTRUTURA/PANORAMA
- answer: Use ### cabeçalhos para cada seção do livro. CADA ### DEVE ESTAR EM LINHA SEPARADA.
- keyTerms: [] (vazio — termos não são relevantes para perguntas estruturais)
- verses: [] (vazio — as referências já estão no texto)
- suggestedQuestions: 2-3 perguntas que aprofundam seções específicas`,

        exegetical: `
TIPO DE PERGUNTA DETECTADO: EXEGESE/VERSÍCULO
- answer: SEPARE em parágrafos distintos (use \n\n no JSON string):
  1º parágrafo: Cite o versículo e explique o contexto
  2º parágrafo: Analise termos no idioma original com *transliteração* (caracteres) — "significado"
  3º parágrafo: Significado teológico e conexões com outras passagens
  4º parágrafo (opcional): Reflexão pastoral breve
  NUNCA escreva tudo em 1 parágrafo. Cada aspecto = parágrafo separado.
- keyTerms: INCLUA 1-3 termos-chave mencionados na resposta. Cada termo DEVE ter: original (caracteres gregos/hebraicos), transliteration, language, meaning. NUNCA invente termos.
- verses: 2-3 versículos ADICIONAIS para estudo (não repita os do answer)
- suggestedQuestions: 2-3 perguntas que aprofundam a exegese`,

        simple: `
TIPO DE PERGUNTA DETECTADO: PERGUNTA GERAL
- answer: 1-3 parágrafos concisos
- keyTerms: [] (vazio, a menos que o tema envolva análise linguística)
- verses: 1-2 versículos relevantes para estudo
- suggestedQuestions: 2-3 perguntas relacionadas`
    };

    return base + typeRules[questionType] + `

REGRAS ABSOLUTAS:
1. NUNCA invente versículos ou termos gregos/hebraicos.
2. NUNCA tome posição denominacional.
3. Priorize idioma original (Grego NT, Hebraico AT).
4. RESPONDA APENAS O JSON.`;
}

// ---------- API ----------

export async function askNicodemos(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<NicodemusResponse> {

    if (!GROQ_API_KEY) {
        throw new Error("Chave de API do Groq não configurada. Adicione VITE_GROQ_API_KEY no arquivo .env");
    }

    if (conversationHistory.length === 0) {
        const cached = getCachedResponse(userMessage);
        if (cached) return cached;
    }

    // Detect question type
    const questionType = detectQuestionType(userMessage);

    const historyLength = conversationHistory.length;

    let maxTokens = 300;
    if (questionType === 'greeting') {
        maxTokens = 100;
    } else if (questionType === 'structural') {
        maxTokens = 2048;
    } else if (questionType === 'exegetical') {
        maxTokens = 1800;
    } else if (historyLength >= 10) {
        maxTokens = 2048;
    } else if (historyLength >= 6) {
        maxTokens = 1200;
    } else if (historyLength >= 2) {
        maxTokens = 700;
    }

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(questionType);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: 'user', content: userMessage }
    ];

    // Models to try in order of preference
    const models = [
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'mixtral-8x7b-32768',
        'llama-3.1-8b-instant'
    ];

    let lastError: any;

    for (const model of models) {
        try {
            console.log(`[Nicodemos] Tentando modelo: ${model}`); // Debug log

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages,
                    temperature: questionType === 'exegetical' ? 0.4 : 0.5,
                    max_tokens: maxTokens,
                    top_p: 0.85,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn(`[Nicodemos] Falha no modelo ${model}:`, errorData);
                throw new Error(errorData?.error?.message || `Erro API Groq (${response.status})`);
            }

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || '';

            let result: NicodemusResponse;

            try {
                const parsed = JSON.parse(rawContent);
                const fixedAnswer = fixMarkdownLineBreaks(parsed.answer || rawContent);

                result = {
                    answer: fixedAnswer,
                    verses: validateVerses(parsed.verses),
                    keyTerms: validateKeyTerms(parsed.keyTerms),
                    suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
                        ? parsed.suggestedQuestions.filter((q: unknown) => typeof q === 'string' && q.length > 0)
                        : [],
                    model: data.model || model
                };
            } catch {
                result = {
                    answer: fixMarkdownLineBreaks(rawContent),
                    verses: [],
                    keyTerms: [],
                    suggestedQuestions: [],
                    model: data.model || model
                };
            }

            if (conversationHistory.length === 0) {
                setCachedResponse(userMessage, result);
            }

            return result; // Success! Return immediately.

        } catch (error) {
            lastError = error;
            // Continue to next model
        }
    }

    // If all models fail
    throw lastError || new Error("Todos os modelos de IA falharam. Tente novamente mais tarde.");
}
