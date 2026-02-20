import * as Papa from 'papaparse';

export interface ParsedTransaction {
    date: Date;
    amount: number;
    description: string;
    type: 'entrada' | 'saida';
    externalId: string;
    categoria: string;
    contaId?: string;
    subcontaId?: string | null;
}

const CATEGORIAS = [
    {
        categoria: 'Salário',
        keywords: [
            'salario', 'salário', 'folha', 'pagamento pastor',
            'remuneracao', 'remuneração', 'pro labore', 'pró-labore'
        ]
    },
    {
        categoria: 'Dízimo',
        keywords: [
            'dizimo', 'dízimo', 'dizimista'
        ]
    },
    {
        categoria: 'Oferta',
        keywords: [
            'oferta', 'doacao', 'doação', 'contribuicao', 'contribuição'
        ]
    },
    {
        categoria: 'Aluguel',
        keywords: [
            'aluguel', 'locacao', 'locação', 'alugel'
        ]
    },
    {
        categoria: 'Água',
        keywords: [
            'sabesp', 'copasa', 'caern', 'cagece', 'agua', 'água', 'saneamento'
        ]
    },
    {
        categoria: 'Energia',
        keywords: [
            'cemig', 'cpfl', 'light', 'enel', 'elektro', 'coelba',
            'energia', 'eletrica', 'elétrica'
        ]
    },
    {
        categoria: 'Internet',
        keywords: [
            'vivo', 'claro', 'tim', 'oi ', 'net ', 'internet', 'banda larga'
        ]
    },
    {
        categoria: 'Manutenção',
        keywords: [
            'manutencao', 'manutenção', 'reparo', 'conserto', 'reforma'
        ]
    },
];

function autoCategorizarTransacao(desc: string): string {
    const d = desc.toLowerCase();
    for (const { categoria, keywords } of CATEGORIAS) {
        if (keywords.some(k => d.includes(k))) return categoria;
    }
    return 'Outros';
}

export function parseOFX(content: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Extrai blocos de transação
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = content.matchAll(trnRegex);

    for (const match of matches) {
        const block = match[1];

        const get = (tag: string) => {
            const r = new RegExp(`<${tag}>([^<\n\r]+)`, 'i');
            return block.match(r)?.[1]?.trim() || '';
        };

        const amountStr = get('TRNAMT');
        const amount = parseFloat(amountStr.replace(',', '.'));
        const dateStr = get('DTPOSTED');
        const memo = get('MEMO') || get('NAME') || 'Sem descrição';
        const fitid = get('FITID');

        if (!amountStr || !dateStr) continue;

        // Converte data OFX: 20260205120000 -> Date
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        const date = new Date(`${year}-${month}-${day}`);

        transactions.push({
            date,
            amount,
            description: memo,
            type: amount >= 0 ? 'entrada' : 'saida',
            externalId: fitid || `ofx_${Date.now()}_${Math.random()}`,
            categoria: autoCategorizarTransacao(memo),
        });
    }

    if (transactions.length === 0) {
        throw new Error('Nenhuma transação encontrada no arquivo OFX.');
    }

    return transactions;
}

export function parseCSV(fileContent: string): ParsedTransaction[] {
    const { data } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    return (data as any[]).map(row => {
        // Try to find amount column (common names)
        const rawAmount = row['Valor'] || row['value'] || row['VALOR'] || row['Amount'] || row['amount'] || '0';

        // Handle currency formatting (R$ 1.200,50 -> 1200.50)
        let cleanAmountString = rawAmount.toString();

        // Remove currency symbol and whitespace
        cleanAmountString = cleanAmountString.replace(/[R$\s]/g, '');

        // Handle thousands separator (.) and decimal separator (,) common in Brazil
        if (cleanAmountString.includes(',') && cleanAmountString.includes('.')) {
            // 1.200,50
            cleanAmountString = cleanAmountString.replace(/\./g, '').replace(',', '.');
        } else if (cleanAmountString.includes(',')) {
            // 1200,50 -> 1200.50
            cleanAmountString = cleanAmountString.replace(',', '.');
        }

        const valor = parseFloat(cleanAmountString);

        // Try to find date column
        const rawDate = row['Data'] || row['date'] || row['DATA'] || new Date().toISOString();
        let dateObj = new Date();

        // Handle DD/MM/YYYY
        if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
                // Assuming DD/MM/YYYY
                dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        } else {
            dateObj = new Date(rawDate);
        }

        const description = row['Descrição'] || row['Histórico'] || row['description'] || row['Memo'] || 'Sem descrição';

        return {
            date: dateObj,
            amount: valor,
            description: description,
            type: (valor > 0 ? 'entrada' : 'saida') as 'entrada' | 'saida',
            externalId: `csv_${dateObj.getTime()}_${Math.abs(valor)}_${description.substring(0, 10).replace(/\s/g, '')}`, // Generate a pseudo-ID
            categoria: autoCategorizarTransacao(description),
        };
    }).filter(t => !isNaN(t.amount) && t.amount !== 0); // Filter invalid rows
}
