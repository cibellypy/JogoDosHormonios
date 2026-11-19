import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion, Gyroscope } from 'expo-sensors';

import { carregarRecursosVR, RecursosVR } from './assets';
import { montarHtmlCena } from './cenaVR';
import {
  DISTORCAO_K1,
  DISTORCAO_K2,
  DISTORCAO_LENTES,
  INTERVALO_SENSOR_MS,
  PERGUNTAS_POR_PORTAL,
  REMOVER_ACENTOS_3D,
  ROTACAO_CEU_Y,
  TEMPO_EXPLICACAO_MS,
} from './config';
import { TRILHAS, mensagemFinal, preparar, sortearAngulosN } from './perguntas';
import { styles } from './styles';

type Etapa = 'preparo' | 'contagem' | 'menu_vr' | 'jogo' | 'portal' | 'final';
type Feedback = 'correto' | 'errado' | null;

const PONTOS_MAXIMOS = TRILHAS.length * 10;

export default function QuizVR({ onSair }: { onSair: () => void }) {
  const [recursos, setRecursos] = useState<RecursosVR | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('preparo');
  const [contador, setContador] = useState(3);
  const [indice, setIndice] = useState(0);
  const [pontos, setPontos] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [cenaPronta, setCenaPronta] = useState(false);

  const webviewRef = useRef<WebView>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const timerFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAvancoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errosRef = useRef(0);

  const assetsProntos = !!recursos;

  // ----- Carregamento dos recursos (imagens + A-Frame offline) -----
  useEffect(() => {
    let ativo = true;
    carregarRecursosVR()
      .then((r) => ativo && setRecursos(r))
      .catch((e) => console.log('[VR] ERRO AO CARREGAR RECURSOS:', e));
    return () => {
      ativo = false;
    };
  }, []);

  // Só remonta o HTML quando os recursos mudam (não a cada ponto ganho)
  const htmlCena = useMemo(
    () =>
      recursos
        ? montarHtmlCena({
            imagemUri: recursos.imagemUri,
            portalUri: recursos.portalUri,
            aframeJs: recursos.aframeJs,
            rotacaoCeuY: ROTACAO_CEU_Y,
            removerAcentos: REMOVER_ACENTOS_3D,
            distorcao: { ativa: DISTORCAO_LENTES, k1: DISTORCAO_K1, k2: DISTORCAO_K2 },
          })
        : '',
    [recursos]
  );

  // Conteúdo e HUD (eventos raros): postMessage com JSON
  const enviarParaCena = (obj: object) => {
    webviewRef.current?.postMessage(JSON.stringify(obj));
  };

  // Sensores (muitas vezes por segundo): injectJavaScript direto, sem JSON
  const injetar = (js: string) => {
    webviewRef.current?.injectJavaScript(`${js};true;`);
  };

  const limparTimers = () => {
    if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);
    if (timerAvancoRef.current) clearTimeout(timerAvancoRef.current);
    timerFeedbackRef.current = null;
    timerAvancoRef.current = null;
  };

  const mostrarFeedback = (tipo: Feedback, ms: number) => {
    if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);
    setFeedback(tipo);
    timerFeedbackRef.current = setTimeout(() => {
      setFeedback(null);
      timerFeedbackRef.current = null;
    }, ms);
  };

  const resetarProgressoVR = () => {
    limparTimers();
    errosRef.current = 0;
    setIndice(0);
    setPontos(0);
    setFeedback(null);
    setExplicacao(null);
  };

  // ----- Navegação -----
  const iniciarExperiencia = async () => {
    StatusBar.setHidden(true);
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    } catch (e) {
      console.log('[VR] Não foi possível travar em landscape:', e);
    }
    setContador(3);
    setEtapa('contagem');
  };

  const sairVR = () => {
    limparTimers();
    // StatusBar e orientação são restaurados na limpeza do useEffect abaixo.
    onSair();
  };

  const comecarJogoVR = () => {
    resetarProgressoVR();
    setEtapa('jogo');
  };

  // Contagem regressiva 3, 2, 1 antes de entrar no mundo
  useEffect(() => {
    if (etapa !== 'contagem') return undefined;

    if (contador > 0) {
      const t = setTimeout(() => setContador((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }

    setCenaPronta(false);
    setEtapa('menu_vr');
    return undefined;
  }, [etapa, contador]);

  // Botão "voltar" do Android sai do VR
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      sairVR();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Limpeza ao sair da tela de VR (por qualquer caminho)
  useEffect(() => {
    return () => {
      limparTimers();
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((e) =>
        console.log('[VR] Erro ao voltar para retrato:', e)
      );
    };
  }, []);

  // ----- Lógica do jogo -----
  const dispararFlashTeleporte = () => {
    flashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.5, duration: 250, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  };

  const responderCerto = () => {
    // Acertar de primeira vale 10 pontos; com erros vale 5.
    setPontos((p) => p + (errosRef.current === 0 ? 10 : 5));

    const atual = indice;
    setExplicacao(TRILHAS[atual].explicacao);
    mostrarFeedback('correto', TEMPO_EXPLICACAO_MS);

    if (timerAvancoRef.current) clearTimeout(timerAvancoRef.current);
    timerAvancoRef.current = setTimeout(() => {
      timerAvancoRef.current = null;
      errosRef.current = 0;
      setExplicacao(null);
      setFeedback(null);

      const ultima = atual >= TRILHAS.length - 1;
      const terminouBloco = !ultima && (atual + 1) % PERGUNTAS_POR_PORTAL === 0;

      if (ultima) setEtapa('final');
      else if (terminouBloco) setEtapa('portal');
      else setIndice(atual + 1);
    }, TEMPO_EXPLICACAO_MS);
  };

  const responderErrado = () => {
    errosRef.current += 1;
    mostrarFeedback('errado', 900);
  };

  const avancarProximaEstacao = () => {
    dispararFlashTeleporte();
    errosRef.current = 0;
    setIndice(indice + 1);
    setEtapa('jogo');
  };

  const aoReceberMensagemWebView = (event: WebViewMessageEvent) => {
    console.log('[VR] MENSAGEM DA CENA:', event.nativeEvent.data);
    try {
      const dados = JSON.parse(event.nativeEvent.data);

      if (dados.tipo === 'pronto') {
        setCenaPronta(true);
        return;
      }

      if (dados.tipo !== 'clique') return;

      switch (dados.acao) {
        case 'comecar':
        case 'reiniciar':
          comecarJogoVR();
          break;
        case 'sair':
          sairVR();
          break;
        case 'responder':
          if (dados.correta) responderCerto();
          else responderErrado();
          break;
        case 'avancar':
          avancarProximaEstacao();
          break;
      }
    } catch (e) {
      console.log('[VR] Mensagem inválida da WebView:', e);
    }
  };

  // ----- Envia o conteúdo 3D (cards / portal) para a cena -----
  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;

    let payload: object | null = null;

    if (etapa === 'menu_vr') {
      const [a1, a2] = sortearAngulosN(2);
      payload = {
        tipo: 'conteudo',
        modo: 'escolha',
        opcoes: [
          { texto: 'COMEÇAR', angulo: a1, acao: 'comecar' },
          { texto: 'SAIR', angulo: a2, acao: 'sair' },
        ],
      };
    } else if (etapa === 'jogo') {
      const q = preparar(indice);
      const angulos = sortearAngulosN(q.opcoes.length);
      payload = {
        tipo: 'conteudo',
        modo: 'escolha',
        opcoes: q.opcoes.map((op, i) => ({ ...op, angulo: angulos[i] })),
      };
    } else if (etapa === 'portal') {
      payload = { tipo: 'conteudo', modo: 'portal', angulo: 0 };
    } else if (etapa === 'final') {
      const [a1, a2] = sortearAngulosN(2);
      payload = {
        tipo: 'conteudo',
        modo: 'escolha',
        opcoes: [
          { texto: 'JOGAR DE NOVO', angulo: a1, acao: 'reiniciar' },
          { texto: 'SAIR', angulo: a2, acao: 'sair' },
        ],
      };
    }

    if (payload) enviarParaCena(payload);
  }, [cenaPronta, etapa, indice]);

  // ----- Envia o texto do HUD -----
  const perguntaAtual = explicacao
    ? `Correto! ${explicacao}`
    : etapa === 'jogo'
      ? TRILHAS[indice].pergunta
      : etapa === 'menu_vr'
        ? 'Olhe para um card e espere para escolher!'
        : etapa === 'portal'
          ? 'Muito bem! Encontre o portal para continuar!'
          : `${mensagemFinal(pontos / PONTOS_MAXIMOS)} Você fez ${pontos} de ${PONTOS_MAXIMOS} pontos!`;

  useEffect(() => {
    if (!cenaPronta || !webviewRef.current) return;

    const concluidas =
      etapa === 'final'
        ? TRILHAS.length
        : etapa === 'portal'
          ? Math.min(indice + 1, TRILHAS.length)
          : indice;

    enviarParaCena({
      tipo: 'hud',
      pergunta: perguntaAtual,
      indice,
      concluidas,
      total: etapa === 'menu_vr' ? 0 : TRILHAS.length,
      feedback,
    });
  }, [cenaPronta, etapa, indice, feedback, perguntaAtual]);

  // ----- Sensores: DeviceMotion com fallback para Gyroscope -----
  const sensoresAtivos = cenaPronta && etapa !== 'preparo' && etapa !== 'contagem';

  useEffect(() => {
    if (!sensoresAtivos) return undefined;

    let cancelado = false;
    let assinaturaDeviceMotion: any = null;
    let assinaturaGyroscope: any = null;
    let watchdogDeviceMotion: ReturnType<typeof setTimeout> | null = null;
    let watchdogGyroscope: ReturnType<typeof setTimeout> | null = null;
    let recebeuDeviceMotion = false;
    let recebeuGyroscope = false;
    let ultimoTempoGyro: number | null = null;

    const removerDeviceMotion = () => {
      try {
        assinaturaDeviceMotion?.remove?.();
      } catch (_) {}
      assinaturaDeviceMotion = null;
      if (watchdogDeviceMotion) clearTimeout(watchdogDeviceMotion);
      watchdogDeviceMotion = null;
    };

    const removerGyroscope = () => {
      try {
        assinaturaGyroscope?.remove?.();
      } catch (_) {}
      assinaturaGyroscope = null;
      if (watchdogGyroscope) clearTimeout(watchdogGyroscope);
      watchdogGyroscope = null;
    };

    const iniciarGyroscope = () => {
      if (cancelado) return;
      removerDeviceMotion();

      try {
        Gyroscope.setUpdateInterval(INTERVALO_SENSOR_MS);
        ultimoTempoGyro = null;

        assinaturaGyroscope = Gyroscope.addListener((medida) => {
          if (cancelado || !webviewRef.current || !medida) return;

          recebeuGyroscope = true;
          if (watchdogGyroscope) clearTimeout(watchdogGyroscope);
          watchdogGyroscope = null;

          const agora = Date.now();
          if (ultimoTempoGyro == null) {
            ultimoTempoGyro = agora;
            return;
          }

          const deltaTempo = Math.min(0.05, Math.max(0.001, (agora - ultimoTempoGyro) / 1000));
          ultimoTempoGyro = agora;

          const x = Number(medida.x) || 0;
          const y = Number(medida.y) || 0;
          injetar(`window.__rn&&window.__rn.gy(${x},${y},${deltaTempo})`);
        });

        watchdogGyroscope = setTimeout(() => {
          if (cancelado || recebeuGyroscope) return;
          console.log('[VR] Gyroscope não entregou eventos. Mantendo controle por toque.');
          removerGyroscope();
        }, 1500);
      } catch (error) {
        console.log('[VR] Erro ao iniciar Gyroscope:', error);
        removerGyroscope();
      }
    };

    const iniciarDeviceMotion = async () => {
      try {
        if (Platform.OS === 'ios') {
          try {
            let permissao = await DeviceMotion.getPermissionsAsync();
            if (!permissao.granted && permissao.canAskAgain) {
              permissao = await DeviceMotion.requestPermissionsAsync();
            }
            if (!permissao.granted || cancelado) {
              iniciarGyroscope();
              return;
            }
          } catch (erroPermissao) {
            console.log('[VR] Erro ao consultar permissão de movimento:', erroPermissao);
          }
        }

        if (cancelado) return;

        DeviceMotion.setUpdateInterval(INTERVALO_SENSOR_MS);

        assinaturaDeviceMotion = DeviceMotion.addListener((medida) => {
          if (cancelado || !medida?.rotation || !webviewRef.current) return;

          recebeuDeviceMotion = true;
          if (watchdogDeviceMotion) clearTimeout(watchdogDeviceMotion);
          watchdogDeviceMotion = null;

          const { alpha, beta, gamma } = medida.rotation;
          injetar(
            `window.__rn&&window.__rn.sn(${Number(alpha) || 0},${Number(beta) || 0},${Number(gamma) || 0},-90)`
          );
        });

        watchdogDeviceMotion = setTimeout(() => {
          if (cancelado || recebeuDeviceMotion) return;
          console.log('[VR] DeviceMotion sem eventos. Ativando fallback Gyroscope.');
          iniciarGyroscope();
        }, 1200);
      } catch (error) {
        console.log('[VR] Erro ao iniciar DeviceMotion:', error);
        if (!cancelado) iniciarGyroscope();
      }
    };

    iniciarDeviceMotion();

    return () => {
      cancelado = true;
      removerDeviceMotion();
      removerGyroscope();
    };
  }, [sensoresAtivos]);

  // ---------------------------------------------------------------------------
  // TELAS
  // ---------------------------------------------------------------------------
  if (etapa === 'preparo') {
    return (
      <View style={styles.containerPreparo}>
        <Text style={styles.emojiGrande}>🥽</Text>
        <Text style={styles.titulo}>Jornada VR dos Hormônios</Text>
        <Text style={styles.subtitulo}>
          Encaixe o celular nos óculos VR. Para escolher uma resposta, olhe fixamente para o card
          até o círculo fechar. Se tiver controle Bluetooth, aperte o botão dele.
        </Text>

        <TouchableOpacity
          style={[styles.btnComecar, !assetsProntos && { opacity: 0.5 }]}
          onPress={iniciarExperiencia}
          disabled={!assetsProntos}
        >
          <Text style={styles.txtBtn}>
            {assetsProntos ? 'ENTRAR NO MUNDO VR!' : 'Carregando cenário...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={sairVR}>
          <Text style={styles.txtVoltar}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (etapa === 'contagem') {
    return (
      <View style={styles.containerContagem}>
        <Text style={styles.txtContagem}>{contador === 0 ? 'VAMOS!' : contador}</Text>
        <Text style={styles.txtAviso}>Coloque os óculos agora!</Text>
      </View>
    );
  }

  return (
    <View style={styles.containerVR}>
      {assetsProntos && (
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: htmlCena }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          androidLayerType="hardware"
          overScrollMode="never"
          bounces={false}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onLoadEnd={() => console.log('[VR] WEBVIEW CARREGOU')}
          onMessage={aoReceberMensagemWebView}
          onError={(e) => console.log('[VR] Erro da WebView:', e.nativeEvent)}
          onHttpError={(e) => console.log('[VR] Erro HTTP da WebView:', e.nativeEvent)}
        />
      )}

      {!assetsProntos && (
        <View style={styles.carregando}>
          <Text style={styles.txtCarregando}>Carregando cenário...</Text>
        </View>
      )}

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity }]} />
    </View>
  );
}