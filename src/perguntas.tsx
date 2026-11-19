export type Opcao = { texto: string; correta: boolean };
export type Pergunta = { pergunta: string; opcoes: Opcao[]; explicacao: string };

export const TRILHAS: Pergunta[] = [
  {
    pergunta: 'Qual hormônio estimula o fototropismo e o alongamento celular?',
    opcoes: [
      { texto: 'Auxina (AIA)', correta: true },
      { texto: 'Etileno', correta: false },
      { texto: 'Citocinina', correta: false },
    ],
    explicacao:
      'A auxina se acumula no lado sombreado do caule, que se alonga mais e faz a planta curvar em direção à luz.',
  },
  {
    pergunta: 'Qual hormônio gasoso é responsável pelo amadurecimento dos frutos?',
    opcoes: [
      { texto: 'Etileno', correta: true },
      { texto: 'Giberelina', correta: false },
      { texto: 'Ácido Abscísico', correta: false },
    ],
    explicacao:
      'O etileno é um gás que acelera o amadurecimento dos frutos e também participa da queda das folhas (abscisão).',
  },
  {
    pergunta: 'Qual hormônio estimula a quebra de dormência e a germinação das sementes?',
    opcoes: [
      { texto: 'Giberelina', correta: true },
      { texto: 'Ácido Abscísico', correta: false },
      { texto: 'Auxina (AIA)', correta: false },
    ],
    explicacao:
      'A giberelina ativa enzimas que mobilizam as reservas da semente, promovendo a germinação e o crescimento do caule.',
  },
  {
    pergunta: 'Qual hormônio promove a divisão celular e retarda o envelhecimento das folhas?',
    opcoes: [
      { texto: 'Citocinina', correta: true },
      { texto: 'Etileno', correta: false },
      { texto: 'Ácido Abscísico', correta: false },
    ],
    explicacao:
      'A citocinina estimula a citocinese e retarda a senescência foliar. Ela atua em conjunto com a auxina.',
  },
  {
    pergunta: 'Qual hormônio fecha os estômatos em falta de água e mantém a dormência das sementes?',
    opcoes: [
      { texto: 'Ácido Abscísico', correta: true },
      { texto: 'Auxina (AIA)', correta: false },
      { texto: 'Giberelina', correta: false },
    ],
    explicacao:
      'O ácido abscísico (ABA) é o hormônio do estresse: ajuda a planta a economizar água e inibe a germinação fora de hora.',
  },
];

export function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function preparar(i: number): Pergunta {
  const q = TRILHAS[i];
  return { ...q, opcoes: embaralhar(q.opcoes) };
}

// CORRIGIDO: recebe uma FRAÇÃO de 0 a 1 (aproveitamento), não uma contagem de acertos.
// 2D: acertos / total. VR: pontos / (total * 10).
export function mensagemFinal(fracao: number) {
  if (fracao >= 1) return 'Perfeito! Você domina os fitormônios!';
  if (fracao >= 0.6) return 'Muito bem! Falta pouco para dominar tudo.';
  return 'Revise os hormônios e tente de novo!';
}

// Distribui N cards num arco na frente do jogador (em graus).
export function sortearAngulosN(n: number): number[] {
  const larguraArco = n > 2 ? 66 : n > 1 ? 50 : 0;
  const inicio = -larguraArco / 2;
  const passo = n > 1 ? larguraArco / (n - 1) : 0;
  const angulos: number[] = [];
  for (let i = 0; i < n; i += 1) {
    angulos.push(Math.round((inicio + i * passo + 360) % 360));
  }
  return angulos;
}