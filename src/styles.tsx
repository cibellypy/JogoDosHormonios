import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C3A27' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  subtituloHome: { fontSize: 16, color: '#A5D6A7', marginBottom: 40, textAlign: 'center' },
  placar: { fontSize: 48, fontWeight: 'bold', color: '#FFF', marginVertical: 12 },
  btnInicio: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 8,
    width: '80%',
    alignItems: 'center',
  },
  btnVR: { backgroundColor: '#0288D1' },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Preparo / contagem / VR
  containerPreparo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C3A27',
    padding: 20,
  },
  emojiGrande: { fontSize: 64, marginBottom: 10 },
  subtitulo: {
    fontSize: 15,
    color: '#A5D6A7',
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  btnComecar: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 4,
  },
  txtVoltar: { color: '#A5D6A7', marginTop: 15, textDecorationLine: 'underline' },
  containerContagem: {
    flex: 1,
    backgroundColor: '#0B1F14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtContagem: { fontSize: 90, fontWeight: '900', color: '#86EFAC' },
  txtAviso: { color: '#BBF7D0', fontSize: 16, marginTop: 10 },
  containerVR: { flex: 1, backgroundColor: '#000000' },
  webview: { flex: 1, backgroundColor: '#000000' },
  carregando: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txtCarregando: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#BBF7D0' },

  // Quiz 2D
  quizConteudo: { padding: 20, paddingTop: 40 },
  status: { color: '#A5D6A7', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  pergunta: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  opcao: { padding: 16, borderRadius: 14, marginVertical: 6 },
  txtOpcao: { color: '#1B5E20', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  explicacao: { color: '#FFF', fontSize: 16, marginVertical: 16, lineHeight: 22 },
  sair: { color: '#A5D6A7', textAlign: 'center', fontSize: 15 },
});