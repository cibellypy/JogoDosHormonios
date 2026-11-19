
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';

type HomeProps = {
  onIniciarQuiz2D: () => void;
  onIniciarVR: () => void;
};

export default function Home({
  onIniciarQuiz2D,
  onIniciarVR,
}: HomeProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#102719"
      />

      <View style={styles.conteudo}>

        {/* CABEÇALHO */}
        <View style={styles.cabecalho}>
          <Text style={styles.emoji}>🌿</Text>

          <Text style={styles.titulo}>
            JORNADA DOS
          </Text>

          <Text style={styles.tituloDestaque}>
            HORMÔNIOS
          </Text>

          <Text style={styles.subtitulo}>
            Descubra os segredos dos fitormônios
            e explore o mundo das plantas!
          </Text>
        </View>

        {/* ILUSTRAÇÃO */}
        <View style={styles.ilustracao}>
          <Text style={styles.planta}>🌱</Text>
          <Text style={styles.frase}>
            A natureza está cheia de descobertas!
          </Text>
        </View>

        {/* OPÇÕES DE JOGO */}
        <View style={styles.opcoes}>

          <Text style={styles.escolha}>
            ESCOLHA SUA EXPERIÊNCIA
          </Text>

          {/* QUIZ 2D */}
          <TouchableOpacity
            style={styles.botao2D}
            onPress={onIniciarQuiz2D}
            activeOpacity={0.8}
          >
            <Text style={styles.iconeBotao}>📱</Text>

            <View style={styles.textosBotao}>
              <Text style={styles.tituloBotao}>
                JOGAR EM 2D
              </Text>

              <Text style={styles.descricaoBotao}>
                Responda perguntas e teste seus conhecimentos.
              </Text>
            </View>

            <Text style={styles.seta}>➜</Text>
          </TouchableOpacity>

          {/* QUIZ VR */}
          <TouchableOpacity
            style={styles.botaoVR}
            onPress={onIniciarVR}
            activeOpacity={0.8}
          >
            <Text style={styles.iconeBotao}>🥽</Text>

            <View style={styles.textosBotao}>
              <Text style={styles.tituloBotao}>
                EXPERIÊNCIA VR
              </Text>

              <Text style={styles.descricaoBotao}>
                Entre em um ambiente imersivo em realidade virtual.
              </Text>
            </View>

            <Text style={styles.seta}>➜</Text>
          </TouchableOpacity>

        </View>

        {/* RODAPÉ */}
        <Text style={styles.rodape}>
          APRENDA • EXPLORE • DESCUBRA
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102719',
  },

  conteudo: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
  },

  cabecalho: {
    alignItems: 'center',
  },

  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },

  titulo: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: 3,
  },

  tituloDestaque: {
    color: '#86EFAC',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
  },

  subtitulo: {
    color: '#C5E1C5',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 23,
    maxWidth: 310,
  },

  ilustracao: {
    alignItems: 'center',
    marginVertical: 5,
  },

  planta: {
    fontSize: 75,
  },

  frase: {
    color: '#A5D6A7',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 5,
  },

  opcoes: {
    width: '100%',
  },

  escolha: {
    color: '#A5D6A7',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },

  botao2D: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#277A45',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 5,
  },

  botaoVR: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17658A',
    borderRadius: 18,
    padding: 18,
    elevation: 5,
  },

  iconeBotao: {
    fontSize: 32,
    marginRight: 14,
  },

  textosBotao: {
    flex: 1,
  },

  tituloBotao: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  descricaoBotao: {
    color: '#E0F2E5',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },

  seta: {
    color: '#FFFFFF',
    fontSize: 25,
    marginLeft: 8,
  },

  rodape: {
    color: '#6FA982',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 8,
  },
});
