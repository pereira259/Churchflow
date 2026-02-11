import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is missing in .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY || "dummy_key_to_prevent_init_crash");

export interface AgentUpdate {
    agent: 'scholar' | 'specialist' | 'auditor';
    status: 'thinking' | 'searching' | 'debating' | 'approved' | 'rejected';
    message: string;
}

export interface FinalResponse {
    answer: string;
    sources: string[];
    iterations: number;
}

const SCHOLAR_PROMPT = `Você é o "Levita Pesquisador" do ChurchFlow. 
Sua tarefa é extrair informações brutas, versículos e fatos históricos sobre o tema solicitado.
Foque em:
1. Contexto Histórico e Cultural.
2. Significados nos idiomas originais (Hebraico, Grego, Aramaico) quando relevante.
3. Referências Cruzadas na Bíblia.
Não dê opiniões teológicas, apenas fatos e dados das Escrituras.`;

const SPECIALIST_PROMPT = `Você é "Nicodemos, o Mestre em Israel". 
Sua tarefa é pegar os fatos trazidos pelo Levita e formular uma resposta profunda e sábia.
Personalidade:
- Sábio, ponderado e focado no Novo Nascimento e na Graça.
- Use um tom de "rabi ensinando discípulo": respeitoso, mas com autoridade bíblica.
- Sempre conecte o tema a Jesus Cristo (Cristocêntrico).
- Use frases como "As Escrituras nos mostram...", "Em verdade...", "Observe o contexto...".
Evite polêmicas denominacionais, foque no consenso bíblico ortodoxo.`;

const AUDITOR_PROMPT = `Você é o "Bereano Auditor". 
Sua tarefa é RIGOROSA (Atos 17:11). Analise a resposta de Nicodemos em busca de:
1. Alucinações (fatos não contidos na pesquisa ou na Bíblia).
2. Heresias ou desvios doutrinários graves.
3. Especulações sem base bíblica clara.
Se a resposta for bíblica e sólida, responda apenas: "APROVADO".
Se houver falhas, liste as falhas e diga: "REJEITADO".
Seja exigente. A sã doutrina não pode ser comprometida.`;

export async function runTheologicalCommittee(
    userQuery: string,
    onUpdate: (update: AgentUpdate) => void
): Promise<FinalResponse> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Using latest alias as specific versions had quota/404 issues

    let iterations = 0;
    let isApproved = false;
    let currentScholarData = "";
    let currentTheologicalAnswer = "";
    const sources: string[] = [];

    // 1. Scholar Step
    onUpdate({ agent: 'scholar', status: 'searching', message: "Varrendo bases teológicas e referências..." });
    const scholarResult = await model.generateContent([SCHOLAR_PROMPT, userQuery]);
    currentScholarData = scholarResult.response.text();

    while (!isApproved && iterations < 3) {
        iterations++;

        // 2. Specialist Step
        onUpdate({ agent: 'specialist', status: 'thinking', message: `Formulando resposta teológica (Iteração ${iterations})...` });
        const specialistResult = await model.generateContent([
            SPECIALIST_PROMPT,
            `Dados do Pesquisador: ${currentScholarData}`,
            `Pergunta do Usuário: ${userQuery}`
        ]);
        currentTheologicalAnswer = specialistResult.response.text();

        // 3. Auditor Step
        onUpdate({ agent: 'auditor', status: 'debating', message: "Auditando consistência e veracidade..." });
        const auditorResult = await model.generateContent([
            AUDITOR_PROMPT,
            `Resposta a ser auditada: ${currentTheologicalAnswer}`,
            `Dados originais: ${currentScholarData}`
        ]);

        const auditText = auditorResult.response.text();
        if (auditText.includes("APROVADO")) {
            isApproved = true;
            onUpdate({ agent: 'auditor', status: 'approved', message: "Resposta validada com sucesso!" });
        } else {
            onUpdate({ agent: 'auditor', status: 'rejected', message: "Ajustando detalhes para maior precisão..." });
            // Feed back the critique to the specialist in the next loop
            currentScholarData += `\n\nCrítica do Auditor: ${auditText}`;
        }
    }

    return {
        answer: currentTheologicalAnswer,
        sources: sources, // Could be parsed from currentScholarData
        iterations
    };
}
