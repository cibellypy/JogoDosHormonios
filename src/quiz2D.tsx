import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { TRILHAS, Pergunta, mensagemFinal, preparar } from './perguntas';
import { styles } from './styles';
import PlantaCrescendo from './PlantaCrescendo';

export default function Quiz2D({ onSair }: { onSair: () => void }) {
  const [indice, setIndice] = useState(0);
  const [questao, setQuestao] = useState<Pergunta>(() => preparar(0));
  const [escolha, setEscolha] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [fim, setFim] = useState(false);

  const reiniciar = () => {
    setIndice(0);
    setQuestao(preparar(0));
    setEscolha(null);
    setAcertos(0);
    setFim(false);
  };

  const responder = (idx: number) => {
    if (escolha !== null) return;
    setEscolha(idx);
    if (questao.opcoes[idx].correta) setAcertos((a) => a + 1);
  };

  const proxima = () => {
    if (indice < TRILHAS.length - 1) {
      const n = indice + 1;
      setIndice(n);
      setQuestao(preparar(n));
      setEscolha(null);
    } else {
      setFim(true);
    }
  };

  if (fim) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <PlantaCrescendo acertos={acertos} total={TRILHAS.length} />
          <Text style={styles.titulo}>🌿 Fim da jornada!</Text>
          <Text style={styles.placar}>
            {acertos} / {TRILHAS.length}
          </Text>
          <Text style={styles.subtituloHome}>{mensagemFinal(acertos / TRILHAS.length)}</Text>
          <TouchableOpacity style={styles.btnInicio} onPress={reiniciar}>
            <Text style={styles.txtBtn}>🔄 Jogar de novo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnInicio, { backgroundColor: '#555' }]} onPress={onSair}>
            <Text style={styles.txtBtn}>Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.quizConteudo}>
        <PlantaCrescendo acertos={acertos} total={TRILHAS.length} />

        <Text style={styles.status}>
          Pergunta {indice + 1} de {TRILHAS.length}  |  Acertos: {acertos}
        </Text>
        <Text style={styles.pergunta}>{questao.pergunta}</Text>

        {questao.opcoes.map((op, idx) => {
          let cor = '#E8F5E9';
          if (escolha !== null) {
            if (op.correta) cor = '#66BB6A';
            else if (idx === escolha) cor = '#EF5350';
          }
          return (
            <TouchableOpacity
              key={op.texto}
              style={[styles.opcao, { backgroundColor: cor }]}
              onPress={() => responder(idx)}
              disabled={escolha !== null}
            >
              <Text style={styles.txtOpcao}>{op.texto}</Text>
            </TouchableOpacity>
          );
        })}

        {escolha !== null && (
          <>
            <Text style={styles.explicacao}>
              {questao.opcoes[escolha].correta ? '✅ Correto! ' : '❌ Não foi dessa vez. '}
              {questao.explicacao}
            </Text>
            <TouchableOpacity style={styles.btnInicio} onPress={proxima}>
              <Text style={styles.txtBtn}>
                {indice < TRILHAS.length - 1 ? 'Próxima ➡️' : 'Ver resultado'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={onSair} style={{ marginTop: 24 }}>
          <Text style={styles.sair}>⬅️ Voltar ao menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}