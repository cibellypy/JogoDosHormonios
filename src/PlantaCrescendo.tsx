import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// 👉 AJUSTE os nomes/caminhos para as suas imagens, na ordem de crescimento.
// (o caminho é relativo a ESTE arquivo)
const ESTAGIOS = [
  require('../assets/semente.png'),
  require('../assets/broto.png'),
  require('../assets/planta_pequena.png'),
  require('../assets/crescida.png'),
];

type Props = {
  acertos: number; // respostas corretas até agora
  total: number;   // total de perguntas
};

export default function PlantaCrescendo({ acertos, total }: Props) {
  // distribui os estágios ao longo do quiz (funciona com qualquer nº de perguntas)
  const progresso = total > 0 ? acertos / total : 0;
  const estagio = Math.min(
    Math.round(progresso * (ESTAGIOS.length - 1)),
    ESTAGIOS.length - 1
  );

  const escala = useRef(new Animated.Value(1)).current;
  const primeiraVez = useRef(true);

  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    if (acertos === 0) return; // reinício do jogo: sem animação
    escala.setValue(0.6);
    Animated.spring(escala, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [acertos]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={ESTAGIOS[estagio]}
        style={[styles.imagem, { transform: [{ scale: escala }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 150, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  imagem: { width: 140, height: 140 },
});