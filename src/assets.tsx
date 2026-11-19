import { Asset } from 'expo-asset';
// Expo SDK 54+: 'expo-file-system/legacy'. Se for SDK 53 ou anterior, use 'expo-file-system'.
import * as FileSystem from 'expo-file-system/legacy';

const ARQUIVO_IMAGEM_360 = require('../assets/fundovr.jpg');
const ARQUIVO_PORTAL = require('../assets/portal.png');
// A-Frame salvo localmente. Renomeado para .txt para o Metro tratar como asset
const ARQUIVO_AFRAME = require('./aframe.min.aframe');

async function uriLocal(modulo: number): Promise<string> {
  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  // Garante que pega o localUri ou uri de forma segura
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('Não foi possível obter a URI do asset.');
  return uri;
}

async function dataUri(modulo: number, mime: string): Promise<string> {
  const caminho = await uriLocal(modulo);
  // Remove o prefixo file:// se necessário para leitura de alguns sistemas Android no FileSystem
  const caminhoLimpo = PlatformOSCheck(caminho);
  
  const base64 = await FileSystem.readAsStringAsync(caminhoLimpo, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mime};base64,${base64}`;
}

function PlatformOSCheck(uri: string): string {
  // Mantém compatibilidade com o caminho do arquivo
  return uri;
}

async function texto(modulo: number): Promise<string> {
  const caminho = await uriLocal(modulo);
  const conteudo = await FileSystem.readAsStringAsync(caminho, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Diagnóstico: um A-Frame válido tem mais de 1 milhão de caracteres e começa com código JS.
  // Se aparecer algo curto ou começando com "<" (HTML), o arquivo veio errado.
  console.log(
    '[VR] A-Frame lido:',
    conteudo.length,
    'caracteres. Início:',
    conteudo.slice(0, 60).replace(/\s+/g, ' ')
  );

  return conteudo;
}

export type RecursosVR = { imagemUri: string; portalUri: string; aframeJs: string };

// Cache: carrega uma vez só, mesmo se o aluno entrar no VR várias vezes.
let cache: Promise<RecursosVR> | null = null;

export function carregarRecursosVR(): Promise<RecursosVR> {
  if (!cache) {
    cache = Promise.all([
      dataUri(ARQUIVO_IMAGEM_360, 'image/jpeg'),
      dataUri(ARQUIVO_PORTAL, 'image/png'),
      texto(ARQUIVO_AFRAME),
    ])
      .then(([imagemUri, portalUri, aframeJs]) => ({ imagemUri, portalUri, aframeJs }))
      .catch((e) => {
        cache = null; // permite tentar de novo se falhar
        throw e;
      });
  }
  return cache;
}