
export const dailyWords = [
    { text: "O Senhor é o meu pastor, nada me faltará.", reference: "Salmos 23:1" },
    { text: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
    { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", reference: "João 3:16" },
    { text: "Mil cairão ao teu lado, e dez mil à tua direita, mas não chegará a ti.", reference: "Salmos 91:7" },
    { text: "Busca primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", reference: "Mateus 6:33" },
    { text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.", reference: "Isaías 41:10" }
];

export function getDailyWord() {
    // Simple logic: Use day of year to pick a consistent word for the day
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dailyWords[Math.floor(dayOfYear) % dailyWords.length];
}
