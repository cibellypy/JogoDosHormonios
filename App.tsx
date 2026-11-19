
import React, { useState } from 'react';
import { StatusBar } from 'react-native';

// Telas do jogo
import Home from './src/home';
import Quiz2D from './src/quiz2D';
import QuizVR from './src/quizVR';

// Controle das telas
type Tela = 'home' | 'quiz2D' | 'quizVR';

export default function App() {
  const [tela, setTela] = useState<Tela>('home');

  // Voltar para a tela inicial
  const voltarHome = () => {
    setTela('home');
  };

  return (
    <>
      <StatusBar barStyle="light-content" />

      {tela === 'home' && (
        <Home
          onIniciarQuiz2D={() => setTela('quiz2D')}
          onIniciarVR={() => setTela('quizVR')}
        />
      )}

      {tela === 'quiz2D' && (
        <Quiz2D onSair={voltarHome} />
      )}

      {tela === 'quizVR' && (
        <QuizVR onSair={voltarHome} />
      )}
    </>
  );
}
