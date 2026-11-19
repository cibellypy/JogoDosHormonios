// Configurações do VR. Ajuste aqui, sem mexer no resto do código.

export const ROTACAO_CEU_Y = -90; // gira a imagem 360 (mude se a "frente" ficar errada)
export const TEMPO_FUSE_MS = 2500; // tempo olhando para o card para "clicar"
export const TEMPO_EXPLICACAO_MS = 4500; // tempo lendo a explicação após acertar
export const PERGUNTAS_POR_PORTAL = 3; // a cada 3 acertos aparece um portal
export const REMOVER_ACENTOS_3D = true; // se os acentos não aparecerem no VR, mude para true

// Sensores: intervalo entre leituras (ms). 16 = ~60 Hz, 25 = ~40 Hz, 33 = ~30 Hz.
// Agora os dados vão por injectJavaScript (sem JSON), então 25 é um bom começo.
// Se o aparelho engasgar, suba para 33.
export const INTERVALO_SENSOR_MS = 25;

// Correção de distorção das lentes (efeito de barril).
// Deixei DESLIGADA por padrão: teste no celular + óculos antes de ligar.
// Se ligar e a imagem ficar muito "encolhida", reduza K1/K2. Se as bordas
// ainda ficarem esticadas, aumente um pouco.
export const DISTORCAO_LENTES = false;
export const DISTORCAO_K1 = 0.18;
export const DISTORCAO_K2 = 0.06;