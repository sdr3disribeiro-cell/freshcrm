import { Sign, Horoscope } from '../types';

const SALES_TIPS: Record<Sign, string[]> = {
    Capricorn: [ // Elvis
        "A ambição de Saturno exige foco em metas de longo prazo. Feche contratos anuais.",
        "Sua autoridade natural está em alta. Negocie com C-Levels hoje.",
        "Estrutura e disciplina. Organize seu CRM antes de ligar.",
        "Não aceite 'talvez'. Sua persistência quebrará objeções hoje.",
        "O dinheiro flui para quem tem estratégia. Revise seu pipeline.",
        "Postura executiva. Hoje é dia de vestir a camisa de dono.",
        "Frieza na negociação. Deixe o cliente falar primeiro o preço."
    ],
    Aquarius: [ // Vinicius
        "Sua criatividade é sua arma. Surpreenda o cliente com uma solução inovadora.",
        "Quebre o script. A conexão humana hoje vale mais que a técnica.",
        "Conecte-se com o futuro. Venda a visão, não apenas o produto.",
        "Networking é a chave. Peça indicações para seus contatos mais exêntricos.",
        "A liberdade mental traz insights. Mude a abordagem naquele lead travado.",
        "Seja disruptivo. Pergunte o que ninguém teve coragem de perguntar.",
        "A lógica não vende hoje, a emoção da novidade sim."
    ],
    Gemini: [ // Abner
        "Sua comunicação é ouro. Use o WhatsApp para reaquecer leads antigos.",
        "Agilidade mental! Tenha a resposta na ponta da língua para objeções.",
        "Dupla personalidade nas vendas: Amigo do cliente, tubarão no fechamento.",
        "Curiosidade vende. Faça perguntas abertas e deixe o cliente se vender.",
        "Seja versátil. Adapte seu tom de voz ao estilo do cliente.",
        "O caos organizado favorece você. Multitarefa pode funcionar hoje.",
        "Use o humor para quebrar o gelo. O cliente precisa sorrir antes de comprar."
    ]
};

const TEAM_SIGNS: Record<string, Sign> = {
    'Elvis': 'Capricorn',
    'Vinicius': 'Aquarius',
    'Abner': 'Gemini'
};

export const getHoroscope = (userName: string): Horoscope | null => {
    const sign = TEAM_SIGNS[userName];
    if (!sign) return null;

    // Deterministic "Random" based on Date + Sign length (Simple Hash)
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + sign.length;

    const tips = SALES_TIPS[sign];
    const tipIndex = hash % tips.length;

    return {
        sign,
        tip: tips[tipIndex],
        date: dateStr
    };
};

export const getSignNamePT = (sign: Sign): string => {
    const map: Record<Sign, string> = {
        'Capricorn': 'Capricórnio',
        'Aquarius': 'Aquário',
        'Gemini': 'Gêmeos'
    };
    return map[sign];
};
