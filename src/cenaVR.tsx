import { TEMPO_FUSE_MS } from './config';

export type OpcoesCena = {
  imagemUri: string;
  portalUri: string;
  aframeJs: string; // conteúdo do aframe.min.js (carregado offline)
  rotacaoCeuY: number;
  removerAcentos: boolean;
  distorcao: { ativa: boolean; k1: number; k2: number };
};

// ATENÇÃO: este HTML vive dentro de uma template string.
// Dentro do JS da cena NÃO use crases (`) nem ${...}, e para quebra de linha
// em strings use '\\n' (barra dupla).
export function montarHtmlCena(opts: OpcoesCena) {
  const { imagemUri, portalUri, aframeJs, rotacaoCeuY, removerAcentos, distorcao } = opts;

  // Evita que um "</script" dentro do A-Frame feche a tag antes da hora.
  const aframeSeguro = aframeJs.replace(/<\/script/gi, '<\\/script');

  // Só usa o A-Frame embutido se o arquivo realmente parece ser o A-Frame.
  // Se vier vazio ou errado (ex.: o Metro devolveu uma página de erro), cai no CDN
  // (precisa de internet), para a cena nunca ficar sem A-Frame.
  const aframeOk = aframeJs.length > 200000 && aframeJs.indexOf('AFRAME') !== -1;
  const tagAframe = aframeOk
    ? `<script>${aframeSeguro}</script>`
    : '<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <script>
    // Reporta erros de JavaScript da cena para o app.
    // Eles aparecem no terminal como: [VR] MENSAGEM DA CENA: {"tipo":"erro",...}
    (function () {
      function avisar(texto) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'erro', mensagem: String(texto).slice(0, 400) }));
          }
        } catch (e) {}
      }
      window.addEventListener('error', function (e) {
        avisar((e.message || 'erro') + ' @' + (e.lineno || '?') + ':' + (e.colno || '?'));
      });
      window.addEventListener('unhandledrejection', function (e) {
        avisar('promessa rejeitada: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
      });
      var erroOriginal = console.error;
      console.error = function () {
        avisar('console.error: ' + Array.prototype.join.call(arguments, ' '));
        if (erroOriginal) erroOriginal.apply(console, arguments);
      };
      window.__avisarErro = avisar;
    })();
  </script>
  ${tagAframe}
  <script>
    if (typeof AFRAME === 'undefined') {
      // O A-Frame embutido falhou (ex.: sintaxe nova demais para este WebView).
      // Carrega o 1.5.0 do CDN na hora, antes dos próximos scripts rodarem.
      window.__avisarErro('A-Frame embutido falhou. Tentando o 1.5.0 pelo CDN...');
      document.write('<script src="https://aframe.io/releases/1.5.0/aframe.min.js"><\\/script>');
    } else {
      window.__avisarErro('info: A-Frame ' + AFRAME.version + ' carregado');
    }
  </script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; touch-action: none; -webkit-user-select: none; user-select: none; }
    a-scene { position: fixed; inset: 0; width: 100%; height: 100%; }
    canvas { position: absolute; inset: 0; display: block; width: 100% !important; height: 100% !important; touch-action: none; }
  </style>

  <script>
    // Renderização estéreo (Cardboard): um olho em cada metade da tela,
    // com correção opcional de distorção das lentes (barril).
    AFRAME.registerComponent('cardboard-estereo', {
      schema: {
        enabled: { default: true },
        eyeSep: { default: 0.045 },
        maxDpr: { default: 2.0 }
      },

      init: function () {
        var componente = this;
        var cena = this.el;

        var DISTORCAO_ATIVA = ${distorcao.ativa ? 'true' : 'false'};
        var K1 = ${Number(distorcao.k1)};
        var K2 = ${Number(distorcao.k2)};

        cena.addEventListener('renderstart', function () {
          var renderer = cena.renderer;
          if (!renderer || renderer.__estereoAtivo) return;
          renderer.__estereoAtivo = true;

          var renderOriginal = renderer.render.bind(renderer);
          var stereo = new THREE.StereoCamera();
          var tamanho = new THREE.Vector2();
          var ultimaLargura = 0, ultimaAltura = 0, ultimoDpr = 0;

          // ----- Distorção das lentes (render em textura + shader) -----
          var rtL = null, rtR = null, quadScene = null, quadCam = null, quadMat = null;

          function prepararDistorcao(larguraOlho, altura, dpr) {
            var w = Math.max(2, Math.round(larguraOlho * dpr));
            var h = Math.max(2, Math.round(altura * dpr));

            if (!rtL || rtL.width !== w || rtL.height !== h) {
              if (rtL) { rtL.dispose(); rtR.dispose(); }
              var cfg = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
              rtL = new THREE.WebGLRenderTarget(w, h, cfg);
              rtR = new THREE.WebGLRenderTarget(w, h, cfg);
            }

            if (!quadScene) {
              quadScene = new THREE.Scene();
              quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
              quadMat = new THREE.ShaderMaterial({
                uniforms: {
                  tDiffuse: { value: null },
                  k1: { value: K1 },
                  k2: { value: K2 }
                },
                vertexShader: [
                  'varying vec2 vUv;',
                  'void main() {',
                  '  vUv = uv;',
                  '  gl_Position = vec4(position.xy, 0.0, 1.0);',
                  '}'
                ].join('\\n'),
                fragmentShader: [
                  'uniform sampler2D tDiffuse;',
                  'uniform float k1;',
                  'uniform float k2;',
                  'varying vec2 vUv;',
                  'void main() {',
                  '  vec2 c = vUv * 2.0 - 1.0;',
                  '  float r2 = dot(c, c);',
                  '  float f = 1.0 + k1 * r2 + k2 * r2 * r2;',
                  '  vec2 s = c * f;',
                  '  if (abs(s.x) > 1.0 || abs(s.y) > 1.0) {',
                  '    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
                  '  } else {',
                  '    gl_FragColor = texture2D(tDiffuse, s * 0.5 + 0.5);',
                  '  }',
                  '  #include <colorspace_fragment>',
                  '}'
                ].join('\\n'),
                depthTest: false,
                depthWrite: false
              });
              var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat);
              quad.frustumCulled = false;
              quadScene.add(quad);
            }
          }

          function ajustarRenderer(forcar) {
            var largura = Math.max(2, Math.round(window.innerWidth || document.documentElement.clientWidth || 2));
            var altura = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 1));
            var dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), componente.data.maxDpr);

            if (!forcar && largura === ultimaLargura && altura === ultimaAltura && Math.abs(dpr - ultimoDpr) < 0.001) return;

            ultimaLargura = largura;
            ultimaAltura = altura;
            ultimoDpr = dpr;

            renderer.setPixelRatio(dpr);
            renderer.setSize(largura, altura, false);

            var canvas = renderer.domElement;
            if (canvas) {
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.display = 'block';
            }
          }

          function reajustarDepoisDaRotacao() {
            requestAnimationFrame(function () { ajustarRenderer(true); });
            setTimeout(function () { ajustarRenderer(true); }, 80);
            setTimeout(function () { ajustarRenderer(true); }, 300);
          }

          window.addEventListener('resize', reajustarDepoisDaRotacao, { passive: true });
          window.addEventListener('orientationchange', reajustarDepoisDaRotacao, { passive: true });
          document.addEventListener('visibilitychange', function () {
            if (!document.hidden) reajustarDepoisDaRotacao();
          });

          ajustarRenderer(true);

          renderer.render = function (scene3D, camera) {
            if (!componente.data.enabled || !camera || !camera.isPerspectiveCamera || (renderer.xr && renderer.xr.isPresenting)) {
              return renderOriginal(scene3D, camera);
            }

            ajustarRenderer(false);
            renderer.getSize(tamanho);

            var largura = Math.max(2, Math.round(tamanho.x));
            var altura = Math.max(1, Math.round(tamanho.y));
            var metade = Math.floor(largura / 2);
            var larguraEsquerda = metade;
            var larguraDireita = largura - metade;
            var aspectoPorOlho = larguraEsquerda / altura;

            if (Math.abs(camera.aspect - aspectoPorOlho) > 0.0001) {
              camera.aspect = aspectoPorOlho;
              camera.updateProjectionMatrix();
            }

            stereo.eyeSep = componente.data.eyeSep;
            camera.updateMatrixWorld(true);
            stereo.update(camera);

            var autoClearAnterior = renderer.autoClear;
            renderer.autoClear = false;

            if (DISTORCAO_ATIVA) {
              prepararDistorcao(larguraEsquerda, altura, ultimoDpr);

              // 1) cada olho vai para uma textura
              renderer.setRenderTarget(rtL);
              renderer.clear(true, true, true);
              renderOriginal(scene3D, stereo.cameraL);

              renderer.setRenderTarget(rtR);
              renderer.clear(true, true, true);
              renderOriginal(scene3D, stereo.cameraR);

              renderer.setRenderTarget(null);

              // 2) as texturas são desenhadas na tela com o efeito de barril
              renderer.setScissorTest(false);
              renderer.setViewport(0, 0, largura, altura);
              renderer.clear(true, true, true);
              renderer.setScissorTest(true);

              quadMat.uniforms.tDiffuse.value = rtL.texture;
              renderer.setViewport(0, 0, larguraEsquerda, altura);
              renderer.setScissor(0, 0, larguraEsquerda, altura);
              renderOriginal(quadScene, quadCam);

              quadMat.uniforms.tDiffuse.value = rtR.texture;
              renderer.setViewport(larguraEsquerda, 0, larguraDireita, altura);
              renderer.setScissor(larguraEsquerda, 0, larguraDireita, altura);
              renderOriginal(quadScene, quadCam);
            } else {
              renderer.setScissorTest(false);
              renderer.setViewport(0, 0, largura, altura);
              renderer.clear(true, true, true);
              renderer.setScissorTest(true);

              renderer.setViewport(0, 0, larguraEsquerda, altura);
              renderer.setScissor(0, 0, larguraEsquerda, altura);
              renderOriginal(scene3D, stereo.cameraL);

              renderer.setViewport(larguraEsquerda, 0, larguraDireita, altura);
              renderer.setScissor(larguraEsquerda, 0, larguraDireita, altura);
              renderOriginal(scene3D, stereo.cameraR);
            }

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, largura, altura);
            renderer.autoClear = autoClearAnterior;
          };
        });
      }
    });
  </script>
</head>

<body>
  <a-scene
    id="scene"
    embedded
    cardboard-estereo="enabled: true; eyeSep: 0.045; maxDpr: 2.0"
    device-orientation-permission-ui="enabled: false"
    loading-screen="enabled: false"
    xr-mode-ui="enabled: false"
    renderer="antialias: true; precision: high; colorManagement: true"
  >
    <a-assets timeout="15000">
      <img id="ceu" src="${imagemUri}">
      <img id="portal-img" src="${portalUri}">
    </a-assets>

    <a-sky id="sky" src="#ceu" radius="50" segments-width="64" segments-height="32"
           rotation="0 ${rotacaoCeuY} 0" material="shader: flat; side: back; depthWrite: false"></a-sky>

    <a-entity light="type: ambient; color: #FFF; intensity: 0.92"></a-entity>
    <a-entity light="type: directional; color: #FFF; intensity: 0.55" position="1 3 2"></a-entity>

    <a-entity id="rig" position="0 0 0">
      <a-camera
        id="camera"
        position="0 1.6 0"
        camera="near: 0.05; far: 100"
        wasd-controls-enabled="false"
        look-controls="enabled: true; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: true; mouseEnabled: true"
      >
        <a-cursor
          id="cursor"
          fuse="true"
          fuse-timeout="${TEMPO_FUSE_MS}"
          raycaster="objects: .alvo; far: 20; interval: 40"
          material="color: #FFFFFF; shader: flat; opacity: 0.92"
          geometry="primitive: ring; radiusInner: 0.012; radiusOuter: 0.020; segmentsTheta: 32"
          position="0 0 -1"
          animation__fusing="property: scale; startEvents: fusing; from: 1 1 1; to: 0.55 0.55 0.55; dur: ${TEMPO_FUSE_MS}"
          animation__reset="property: scale; startEvents: mouseleave; to: 1 1 1; dur: 120"
        ></a-cursor>

        <!-- HUD: pergunta, progresso e botão de recentrar -->
        <a-entity id="hud-vr">
          <a-plane id="hud-borda" position="0 0.98 -2.36" width="2.34" height="0.38"
                   material="color: #E9C46A; shader: flat; opacity: 0.72; transparent: true"></a-plane>
          <a-plane id="hud-painel" position="0 0.98 -2.34" width="2.26" height="0.31"
                   material="color: #FFF7ED; shader: flat; opacity: 0.90; transparent: true"></a-plane>
          <a-text id="hud-pergunta" value="Carregando..." font="dejavu" position="0 0.98 -2.30"
                  align="center" anchor="center" baseline="center" width="1.98" color="#14532D" wrap-count="32"></a-text>

          <a-entity id="hud-progresso" position="0 0.73 -2.28"></a-entity>

          <a-entity id="btn-recentrar" class="alvo" position="1.13 -0.66 -2.30"
                    geometry="primitive: circle; radius: 0.16; segments: 32"
                    material="color: #14532D; shader: flat; opacity: 0.90; transparent: true">
            <a-text value="REC" font="dejavu" align="center" anchor="center" baseline="center"
                    position="0 0 0.02" width="0.42" color="#FFFFFF"></a-text>
          </a-entity>
        </a-entity>
      </a-camera>
    </a-entity>

    <a-entity id="alvos"></a-entity>
    <a-entity id="vagalumes"></a-entity>
    <a-entity id="petalas"></a-entity>
    <a-entity id="particulas"></a-entity>
  </a-scene>

  <script>
    (function () {
      var SEM_ACENTO = ${removerAcentos ? 'true' : 'false'};
      var REGEX_ACENTOS = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
      function t3d(s) {
        s = String(s == null ? '' : s);
        return SEM_ACENTO ? s.normalize('NFD').replace(REGEX_ACENTOS, '') : s;
      }

      var scene = document.querySelector('#scene');
      var camera = document.querySelector('#camera');
      var cursor = document.querySelector('#cursor');
      var alvos = document.querySelector('#alvos');
      var vagalumes = document.querySelector('#vagalumes');
      var petalas = document.querySelector('#petalas');
      var particulas = document.querySelector('#particulas');
      var btnRecentrar = document.querySelector('#btn-recentrar');
      var hudPergunta = document.querySelector('#hud-pergunta');
      var hudPainel = document.querySelector('#hud-painel');
      var hudBorda = document.querySelector('#hud-borda');
      var hudProgresso = document.querySelector('#hud-progresso');

      // ---------- Céu ----------
      function protegerSky() {
        var sky = document.querySelector('#sky');
        if (!sky) return;
        var aplicar = function () {
          try {
            var mesh = sky.getObject3D('mesh');
            if (mesh) {
              mesh.frustumCulled = false;
              if (mesh.material) {
                mesh.material.depthWrite = false;
                mesh.material.needsUpdate = true;
              }
            }
          } catch (_) {}
        };
        aplicar();
        sky.addEventListener('object3dset', aplicar);
        scene.addEventListener('loaded', aplicar);
      }
      protegerSky();

      // ---------- Estado ----------
      var bloqueado = false;
      var errosNaQuestao = 0;

      function enviarParaApp(dados) {
        try {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(dados));
        } catch (erro) {}
      }

      function normalizarAngulo(a) { return a > 180 ? a - 360 : a; }

      function posicaoPolar(angulo, raio, y) {
        var assinado = normalizarAngulo(Number(angulo || 0));
        var rad = THREE.MathUtils.degToRad(assinado);
        return { x: Math.sin(rad) * raio, y: y, z: -Math.cos(rad) * raio, rotY: -assinado };
      }

      function limparFilhos(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
      }

      function aplicarHover(el) {
        el.addEventListener('mouseenter', function () {
          if (el.__selecionado) return;
          el.setAttribute('scale', '1.08 1.08 1.08');
        });
        el.addEventListener('mouseleave', function () {
          if (el.__selecionado) return;
          el.setAttribute('scale', '1 1 1');
        });
      }

      function criarTexto(parent, texto, largura, posicao, cor) {
        var t = document.createElement('a-text');
        t.setAttribute('value', t3d(texto));
        t.setAttribute('font', 'dejavu');
        t.setAttribute('align', 'center');
        t.setAttribute('anchor', 'center');
        t.setAttribute('baseline', 'center');
        t.setAttribute('width', largura);
        t.setAttribute('position', posicao || '0 0 0.035');
        t.setAttribute('color', cor || '#3F2A14');
        t.setAttribute('wrap-count', '18');
        parent.appendChild(t);
        return t;
      }

      // ---------- Cards ----------
      var MATERIAL_CARD = 'color: #FFF9E8; shader: flat; opacity: 0.97; transparent: true; side: double';

      function criarCardBase(angulo) {
        var p = posicaoPolar(angulo, 3.45, 1.58);
        var card = document.createElement('a-entity');

        card.classList.add('alvo');
        card.setAttribute('position', p.x + ' ' + p.y + ' ' + p.z);
        card.setAttribute('rotation', '0 ' + p.rotY + ' 0');
        card.setAttribute('geometry', 'primitive: plane; width: 1.62; height: 1.04');
        card.setAttribute('material', MATERIAL_CARD);
        card.setAttribute(
          'animation__flutuar',
          'property: position; dir: alternate; loop: true; dur: 1900; easing: easeInOutSine; to: ' +
            p.x + ' ' + (p.y + 0.08) + ' ' + p.z
        );

        var borda = document.createElement('a-plane');
        borda.setAttribute('width', '1.72');
        borda.setAttribute('height', '1.14');
        borda.setAttribute('position', '0 0 -0.018');
        borda.setAttribute('material', 'color: #F7C948; shader: flat; opacity: 0.95');
        card.appendChild(borda);

        aplicarHover(card);
        return card;
      }

      function marcarCard(card, correto) {
        card.__selecionado = correto;
        card.setAttribute(
          'material',
          correto
            ? 'color: #DCFCE7; shader: flat; opacity: 0.98; transparent: true; side: double'
            : 'color: #FEE2E2; shader: flat; opacity: 0.98; transparent: true; side: double'
        );

        if (!correto) {
          var rotY = card.getAttribute('rotation').y;
          card.setAttribute(
            'animation__erro',
            'property: rotation; dir: alternate; loop: 4; dur: 70; from: 0 ' + rotY + ' -2; to: 0 ' + rotY + ' 2'
          );
        }
      }

      // Depois de 2 erros seguidos, a resposta certa fica amarelinha (ajuda sem punir).
      function destacarDica() {
        try {
          var alvo = alvos.querySelector('[data-correta="true"]');
          if (alvo && !alvo.__selecionado) {
            alvo.setAttribute('material', 'color: #FEF08A; shader: flat; opacity: 0.98; transparent: true; side: double');
          }
        } catch (e) {}
      }

      function explosaoDeParticulas() {
        limparFilhos(particulas);

        for (var i = 0; i < 18; i += 1) {
          var part = document.createElement('a-sphere');
          var ang = Math.random() * Math.PI * 2;
          var raio = 0.7 + Math.random() * 1.2;
          var x = Math.cos(ang) * raio;
          var y = 1.15 + Math.random() * 1.25;
          var z = -2.0 - Math.random() * 1.2;

          part.setAttribute('radius', String(0.025 + Math.random() * 0.035));
          part.setAttribute('position', '0 1.6 -2.5');
          part.setAttribute('material', 'color: #86EFAC; shader: flat; opacity: 0.95');
          part.setAttribute('animation__voar', 'property: position; to: ' + x + ' ' + y + ' ' + z + '; dur: 700; easing: easeOutQuad');
          part.setAttribute('animation__sumir', 'property: material.opacity; from: 0.95; to: 0; dur: 700; easing: linear');
          particulas.appendChild(part);
        }

        setTimeout(function () { limparFilhos(particulas); }, 850);
      }

      function criarOpcao(opcao) {
        var card = criarCardBase(opcao.angulo);

        if (opcao.correta && !opcao.acao) card.dataset.correta = 'true';

        criarTexto(card, opcao.texto, 1.35, '0 0 0.04', '#3F2A14');

        card.addEventListener('click', function () {
          if (bloqueado) return;

          // Cards de ação (COMEÇAR, SAIR, JOGAR DE NOVO...)
          if (opcao.acao) {
            bloqueado = true;
            enviarParaApp({ tipo: 'clique', acao: opcao.acao });
            setTimeout(function () { bloqueado = false; }, 350);
            return;
          }

          if (opcao.correta) {
            // Fica bloqueado até chegar o próximo conteúdo (dá tempo de ler a explicação).
            bloqueado = true;
            marcarCard(card, true);
            explosaoDeParticulas();
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: true });
          } else {
            marcarCard(card, false);
            enviarParaApp({ tipo: 'clique', acao: 'responder', correta: false });
            errosNaQuestao += 1;
            if (errosNaQuestao >= 2) destacarDica();
            setTimeout(function () {
              card.removeAttribute('animation__erro');
              card.setAttribute('material', MATERIAL_CARD);
            }, 550);
          }
        });

        alvos.appendChild(card);
      }

      // ---------- Portal ----------
      function criarPortal(angulo) {
        var p = posicaoPolar(angulo, 4.05, 1.65);
        var portal = document.createElement('a-entity');
        portal.classList.add('alvo');
        portal.setAttribute('position', p.x + ' ' + p.y + ' ' + p.z);
        portal.setAttribute('rotation', '0 ' + p.rotY + ' 0');

        var brilho = document.createElement('a-torus');
        brilho.setAttribute('radius', '1.05');
        brilho.setAttribute('radius-tubular', '0.045');
        brilho.setAttribute('segments-radial', '12');
        brilho.setAttribute('segments-tubular', '64');
        brilho.setAttribute('material', 'color: #FCD34D; shader: flat; opacity: 0.82; transparent: true');
        brilho.setAttribute('animation__girar', 'property: rotation; loop: true; dur: 4200; easing: linear; to: 0 0 360');
        portal.appendChild(brilho);

        var img = document.createElement('a-image');
        img.setAttribute('src', '#portal-img');
        img.setAttribute('width', '2.15');
        img.setAttribute('height', '2.65');
        img.setAttribute('position', '0 0 0.025');
        img.setAttribute('material', 'shader: flat; transparent: true; alphaTest: 0.03');
        portal.appendChild(img);

        var legenda = document.createElement('a-text');
        legenda.setAttribute('value', 'CONTINUAR');
        legenda.setAttribute('font', 'dejavu');
        legenda.setAttribute('position', '0 -1.42 0.05');
        legenda.setAttribute('align', 'center');
        legenda.setAttribute('anchor', 'center');
        legenda.setAttribute('width', '2.0');
        legenda.setAttribute('color', '#FFF7C2');
        portal.appendChild(legenda);

        portal.setAttribute(
          'animation__flutuar',
          'property: position; dir: alternate; loop: true; dur: 1700; easing: easeInOutSine; to: ' +
            p.x + ' ' + (p.y + 0.10) + ' ' + p.z
        );

        aplicarHover(portal);

        var hitbox = document.createElement('a-plane');
        hitbox.classList.add('alvo');
        hitbox.setAttribute('width', '2.55');
        hitbox.setAttribute('height', '3.05');
        hitbox.setAttribute('position', '0 0 0.08');
        hitbox.setAttribute('material', 'color: #FFFFFF; opacity: 0.001; transparent: true; shader: flat; side: double');
        portal.appendChild(hitbox);

        function ativarPortal() {
          if (bloqueado) return;
          bloqueado = true;
          portal.setAttribute('animation__entrar', 'property: scale; to: 1.12 1.12 1.12; dur: 180; dir: alternate; loop: 1; easing: easeOutQuad');
          enviarParaApp({ tipo: 'clique', acao: 'avancar' });
          setTimeout(function () { bloqueado = false; }, 1200);
        }

        hitbox.addEventListener('click', ativarPortal);
        portal.addEventListener('click', ativarPortal);

        alvos.appendChild(portal);
      }

      function renderizarConteudo(payload) {
        limparFilhos(alvos);
        bloqueado = false;
        errosNaQuestao = 0;

        if (!payload || !payload.modo) return;

        if (payload.modo === 'escolha') {
          (payload.opcoes || []).forEach(criarOpcao);
        } else if (payload.modo === 'portal') {
          criarPortal(payload.angulo || 0);
        }
      }

      // ---------- HUD ----------
      function atualizarProgresso(concluidas, total, atual) {
        limparFilhos(hudProgresso);

        var qtd = Math.max(0, Number(total || 0));
        if (!qtd) return;

        var espacamento = 0.14;
        var larguraTotal = Math.max(0, (qtd - 1) * espacamento);

        for (var i = 0; i < qtd; i += 1) {
          var ponto = document.createElement('a-circle');
          var feito = i < Number(concluidas || 0);
          var corrente = i === Number(atual || 0) && !feito;

          ponto.setAttribute('radius', corrente ? '0.040' : '0.032');
          ponto.setAttribute('position', (-larguraTotal / 2 + i * espacamento) + ' 0 0');
          ponto.setAttribute(
            'material',
            'shader: flat; color: ' + (feito ? '#FCD34D' : corrente ? '#FFFFFF' : '#8B86A9') + '; opacity: 0.95; transparent: true'
          );
          hudProgresso.appendChild(ponto);
        }
      }

      function atualizarHud(d) {
        if (!d) return;

        var texto = String(d.pergunta || '');
        hudPergunta.setAttribute('value', t3d(texto));

        // O painel cresce para baixo conforme o tamanho do texto (explicações são longas).
        var linhas = Math.max(1, Math.ceil(texto.length / 30));
        var h = Math.max(0.31, 0.14 + linhas * 0.115);
        var topo = 1.135;
        var cy = topo - h / 2;

        hudPainel.setAttribute('height', h);
        hudPainel.setAttribute('position', '0 ' + cy + ' -2.34');
        hudBorda.setAttribute('height', h + 0.07);
        hudBorda.setAttribute('position', '0 ' + cy + ' -2.36');
        hudPergunta.setAttribute('position', '0 ' + cy + ' -2.30');
        hudProgresso.setAttribute('position', '0 ' + (topo - h - 0.10) + ' -2.28');

        atualizarProgresso(d.concluidas, d.total, d.indice);

        var corBorda = '#E9C46A';
        if (d.feedback === 'correto') corBorda = '#86EFAC';
        else if (d.feedback === 'errado') corBorda = '#FDA4AF';

        hudBorda.setAttribute('material', 'color: ' + corBorda + '; shader: flat; opacity: 0.82; transparent: true');
      }

      // ---------- Efeitos de ambiente ----------
      function iniciarVagalumes() {
        if (vagalumes.childElementCount > 0) return;

        for (var i = 0; i < 14; i += 1) {
          var vaga = document.createElement('a-sphere');
          var x = -4 + Math.random() * 8;
          var y = 0.8 + Math.random() * 2.6;
          var z = -2 - Math.random() * 6;
          var x2 = x + (-0.45 + Math.random() * 0.9);
          var y2 = y + (-0.35 + Math.random() * 0.7);
          var z2 = z + (-0.45 + Math.random() * 0.9);
          var duracao = 1800 + Math.round(Math.random() * 2200);

          vaga.setAttribute('radius', '0.025');
          vaga.setAttribute('position', x + ' ' + y + ' ' + z);
          vaga.setAttribute('material', 'color: #FFF3A6; shader: flat; opacity: 0.80; transparent: true');
          vaga.setAttribute('animation__mov', 'property: position; dir: alternate; loop: true; dur: ' + duracao + '; easing: easeInOutSine; to: ' + x2 + ' ' + y2 + ' ' + z2);
          vaga.setAttribute('animation__pisca', 'property: material.opacity; dir: alternate; loop: true; dur: ' + Math.round(700 + Math.random() * 900) + '; from: 0.25; to: 0.95');
          vagalumes.appendChild(vaga);
        }
      }

      function iniciarPetalas() {
        if (petalas.childElementCount > 0) return;

        for (var i = 0; i < 12; i += 1) {
          var petala = document.createElement('a-circle');
          var x = -3.8 + Math.random() * 7.6;
          var z = -2 - Math.random() * 6;
          var yInicio = 2.2 + Math.random() * 2.2;
          var yFim = -0.5 - Math.random();
          var duracao = 5000 + Math.round(Math.random() * 4500);

          petala.setAttribute('radius', '0.035');
          petala.setAttribute('scale', '1.5 0.75 1');
          petala.setAttribute('position', x + ' ' + yInicio + ' ' + z);
          petala.setAttribute('rotation', '0 ' + Math.round(Math.random() * 360) + ' 0');
          petala.setAttribute('material', 'color: #F9A8D4; shader: flat; opacity: 0.55; transparent: true; side: double');
          petala.setAttribute('animation__cair', 'property: position; loop: true; dur: ' + duracao + '; easing: linear; from: ' + x + ' ' + yInicio + ' ' + z + '; to: ' + (x + 0.45) + ' ' + yFim + ' ' + z);
          petala.setAttribute('animation__girar', 'property: rotation; loop: true; dur: ' + Math.round(2600 + Math.random() * 3000) + '; to: 360 360 180; easing: linear');
          petalas.appendChild(petala);
        }
      }

      // ---------- Sensores ----------
      var sensorNativoAtivo = false;
      var autoCalibrado = false;
      var timerAutoCalibracao = null;
      var ultimaOrientacaoBruta = new THREE.Quaternion();
      var possuiOrientacaoBruta = false;
      var offsetYaw = new THREE.Quaternion();
      var eixoY = new THREE.Vector3(0, 1, 0);
      var eulerYaw = new THREE.Euler(0, 0, 0, 'YXZ');

      var gyroInicializado = false;
      var gyroOrientacaoBruta = new THREE.Quaternion();
      var gyroDeltaQuat = new THREE.Quaternion();
      var gyroEixo = new THREE.Vector3();

      var zee = new THREE.Vector3(0, 0, 1);
      var euler = new THREE.Euler();
      var q0 = new THREE.Quaternion();
      var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
      var qSensor = new THREE.Quaternion();
      var qFinal = new THREE.Quaternion();

      function aplicarNaCamera(qBruta) {
        qFinal.copy(offsetYaw).multiply(qBruta);
        camera.object3D.quaternion.copy(qFinal);
        camera.object3D.updateMatrixWorld(true);
      }

      function centralizarVisao() {
        if (!camera || !possuiOrientacaoBruta) return;

        eulerYaw.setFromQuaternion(ultimaOrientacaoBruta, 'YXZ');
        offsetYaw.setFromAxisAngle(eixoY, -eulerYaw.y);
        aplicarNaCamera(ultimaOrientacaoBruta);
      }

      function agendarCalibracaoAutomatica() {
        if (autoCalibrado || timerAutoCalibracao) return;
        timerAutoCalibracao = setTimeout(function () {
          timerAutoCalibracao = null;
          centralizarVisao();
          autoCalibrado = true;
        }, 900);
      }

      function assumirControleNativo() {
        if (sensorNativoAtivo) return;
        sensorNativoAtivo = true;
        camera.setAttribute(
          'look-controls',
          'enabled: false; reverseMouseDrag: false; magicWindowTrackingEnabled: false; touchEnabled: false; mouseEnabled: false'
        );
        agendarCalibracaoAutomatica();
      }

      function aplicarOrientacaoNativa(alpha, beta, gamma, orientacaoTela) {
        if (!camera) return;
        assumirControleNativo();

        var orient = THREE.MathUtils.degToRad(Number(orientacaoTela || -90));

        euler.set(Number(beta) || 0, Number(alpha) || 0, -(Number(gamma) || 0), 'YXZ');

        qSensor.setFromEuler(euler);
        qSensor.multiply(q1);
        qSensor.multiply(q0.setFromAxisAngle(zee, -orient));

        ultimaOrientacaoBruta.copy(qSensor);
        possuiOrientacaoBruta = true;

        aplicarNaCamera(qSensor);
      }

      function aplicarGiroscopioNativo(vx, vy, deltaTempo) {
        if (!camera) return;
        assumirControleNativo();

        if (!gyroInicializado) {
          gyroInicializado = true;
          gyroOrientacaoBruta.copy(camera.object3D.quaternion);
          ultimaOrientacaoBruta.copy(gyroOrientacaoBruta);
          possuiOrientacaoBruta = true;
          offsetYaw.identity();
        }

        var dt = Math.min(0.05, Math.max(0.001, Number(deltaTempo || 0.016)));
        var x = Number(vx || 0);
        var y = Number(vy || 0);
        var limite = THREE.MathUtils.degToRad(8);
        var pitchSeguro = THREE.MathUtils.clamp(-y * dt, -limite, limite);
        var yawSeguro = THREE.MathUtils.clamp(-x * dt, -limite, limite);

        if (Math.sqrt(pitchSeguro * pitchSeguro + yawSeguro * yawSeguro) > 0.000001) {
          gyroEixo.set(0, 1, 0);
          gyroDeltaQuat.setFromAxisAngle(gyroEixo, yawSeguro);
          gyroOrientacaoBruta.multiply(gyroDeltaQuat);

          gyroEixo.set(1, 0, 0);
          gyroDeltaQuat.setFromAxisAngle(gyroEixo, pitchSeguro);
          gyroOrientacaoBruta.multiply(gyroDeltaQuat);

          gyroOrientacaoBruta.normalize();
        }

        ultimaOrientacaoBruta.copy(gyroOrientacaoBruta);
        possuiOrientacaoBruta = true;

        aplicarNaCamera(gyroOrientacaoBruta);
      }

      window.__rn = {
        sn: aplicarOrientacaoNativa,
        gy: aplicarGiroscopioNativo
      };

      // ---------- Controle Bluetooth / toque na tela ----------
      var ultimoAcionamentoControle = 0;

      function ativarAlvoMirado(origem) {
        var agora = Date.now();
        if (agora - ultimoAcionamentoControle < 350) return;

        try {
          var raycaster = cursor.components && cursor.components.raycaster;
          var intersectados = raycaster && raycaster.intersectedEls;
          if (!intersectados || intersectados.length === 0) return;

          var alvo = intersectados.find(function (el) {
            return el && el.classList && el.classList.contains('alvo');
          });
          if (!alvo) return;

          ultimoAcionamentoControle = agora;
          alvo.emit('click', { origem: origem || 'controle' }, false);
        } catch (e) {}
      }

      function tentarAtivarComTecla(evento) {
        var codigos = [13, 23, 32, 66, 96];
        var teclas = ['Enter', ' ', 'Spacebar', 'MediaPlayPause'];
        var ok = codigos.indexOf(evento.keyCode) !== -1 || teclas.indexOf(evento.key) !== -1;
        if (!ok) return;

        if (evento.preventDefault) evento.preventDefault();
        ativarAlvoMirado('controle-bluetooth');
      }

      function tentarAtivarComCliqueExterno(evento) {
        var alvoDireto = evento.target && evento.target.closest ? evento.target.closest('.alvo') : null;
        var recDireto = evento.target && evento.target.closest ? evento.target.closest('#btn-recentrar') : null;
        if (alvoDireto || recDireto) return;
        ativarAlvoMirado('controle-toque');
      }

      btnRecentrar.addEventListener('click', function () { centralizarVisao(); });
      document.addEventListener('keydown', tentarAtivarComTecla, true);
      document.addEventListener('click', tentarAtivarComCliqueExterno, true);

      // ---------- Mensagens vindas do app ----------
      function receberMensagem(event) {
        try {
          var dados = JSON.parse(event.data);

          if (dados.tipo === 'conteudo') renderizarConteudo(dados);
          else if (dados.tipo === 'hud') atualizarHud(dados);
          else if (dados.tipo === 'centralizar') centralizarVisao();
        } catch (erro) {
          console.log('Mensagem inválida do app: ' + erro);
        }
      }

      document.addEventListener('message', receberMensagem);
      window.addEventListener('message', receberMensagem);

      function aoCarregarCena() {
        iniciarVagalumes();
        iniciarPetalas();
        enviarParaApp({ tipo: 'pronto' });
      }

      if (scene.hasLoaded) aoCarregarCena();
      else scene.addEventListener('loaded', aoCarregarCena);
    })();
  </script>
</body>
</html>
`;
}