/* ==========================================================================
   IE.JS — Microsoft Internet Explorer 3.0 / 4.0 do Windows 95
   --------------------------------------------------------------------------
   - Barra de ferramentas clássica (Voltar, Avançar, Parar, Atualizar, Início)
   - Barra de endereço editável com histórico
   - Logotipo animado da Microsoft / IE no canto superior direito
   - Páginas retrô simuladas fiéis dos anos 90:
     1. AltaVista Search (1995)
     2. GeoCities '90s Homepage (Under Construction, Contador de visitas, Webring)
     3. Space Jam (1996) — O lendário site original da Warner Bros
   - Navegação funcional por links internos, status bar e histórico de navegação
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox } = W95.UI;

  // Páginas retrô estáticas simuladas dos anos 90
  const PAGES = {
    'http://www.altavista.digital.com': {
      title: 'AltaVista: Main Page',
      html: `
<div style="font-family: Times New Roman, serif; padding: 12px; background: #ffffff; color: #000000; min-height: 100%;">
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000080; padding-bottom: 8px;">
    <div>
      <font size="+3" color="#000080"><b>AltaVista</b></font><br>
      <font size="-1">Search the Web and Display the Results in English</font>
    </div>
    <div style="text-align: right; font-size: 11px; color: #808080;">
      <b>digital</b><br>
      Digital Equipment Corporation
    </div>
  </div>

  <div style="margin: 16px 0; background: #ffffd0; padding: 10px; border: 1px solid #c0c000;">
    <form onsubmit="event.preventDefault(); window.__ieSearch(this.q.value);" style="margin: 0; display: flex; gap: 8px; align-items: center;">
      <font size="-1"><b>Search:</b></font>
      <input type="text" name="q" value="" style="flex: 1; padding: 3px; font-family: monospace; border: 2px inset #fff;" placeholder="Digite palavras-chave para pesquisar...">
      <input type="submit" value="Submit" style="padding: 2px 8px;">
    </form>
    <div style="font-size: 11px; margin-top: 4px; color: #555;">Tip: Use quotes around phrases: "Windows 95", "Brian Eno"</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px;">
    <div>
      <font size="+1" color="#000080"><b>Features & Categories:</b></font>
      <ul>
        <li><a href="http://www.geocities.com/siliconvalley/heights/9595" style="color: blue;">GeoCities Silicon Valley</a> — Páginas pessoais de programadores</li>
        <li><a href="http://www.spacejam.com" style="color: blue;">Space Jam Official Movie Site (1996)</a></li>
        <li><a href="http://www.altavista.digital.com" style="color: blue;">Technology & Personal Computers</a></li>
        <li><a href="http://www.altavista.digital.com" style="color: blue;">Usenet Newsgroups Search</a></li>
      </ul>
    </div>
    <div style="border-left: 1px dashed #808080; padding-left: 16px;">
      <font size="+1" color="#000080"><b>Surfers' Hot Pick:</b></font>
      <p style="font-size: 13px;">O Windows 95 já vendeu mais de 7 milhões de cópias em suas primeiras 5 semanas no mercado mundial. Modems de 28.8k agora conectam milhões à World Wide Web!</p>
    </div>
  </div>

  <hr size="1" color="#808080" style="margin-top: 28px;">
  <center style="font-size: 11px; color: #808080;">
    Copyright &copy; 1995 Digital Equipment Corporation. All rights reserved.
  </center>
</div>
      `,
    },

    'http://www.geocities.com/siliconvalley/heights/9595': {
      title: 'Welcome to Marco\'s Cyber-Den of 1995!',
      html: `
<div style="background: #000033; color: #00ff00; font-family: 'Comic Sans MS', cursive, sans-serif; padding: 16px; min-height: 100%;">
  <center>
    <marquee scrollamount="4" style="color: #ffff00; font-size: 18px; font-weight: bold; background: #990000; padding: 4px; border: 2px dashed #ffff00;">
      *** BEM-VINDO À MINHA HOME PAGE NA REDE MUNDIAL DE COMPUTADORES! MELHOR VISUALIZADO EM 800x600 E 256 CORES ***
    </marquee>

    <h1 style="color: #ff00ff; text-shadow: 2px 2px #ffff00; font-size: 26px; margin: 12px 0;">
      &#9733; MARCO'S COOL RETRO HOMEPAGE &#9733;
    </h1>

    <div style="border: 3px double #ff9900; background: #000; padding: 6px; display: inline-block; margin: 8px 0; color: #ff9900; font-family: monospace; font-size: 14px;">
      &#9888; EM CONSTRUÇÃO / UNDER CONSTRUCTION &#9888;
    </div>

    <p style="color: #00ffff; font-size: 14px; max-width: 500px;">
      Olá navegante do ciberespaço! Você pousou na minha página pessoal hospedada no maravilhoso bairro <b>SiliconValley</b> da GeoCities.
    </p>

    <!-- Contador de visitas clássico -->
    <div style="margin: 14px 0;">
      <font size="-1" color="#ffffff">Você é o visitante número:</font><br>
      <div style="display: inline-block; background: #000; border: 2px inset #808080; padding: 2px 6px; color: #ff0000; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; letter-spacing: 4px;">
        0 0 4 8 2 7
      </div>
    </div>

    <table border="1" bordercolor="#00ff00" cellpadding="8" style="margin-top: 16px; color: #ffffff; background: #000055;">
      <tr>
        <th colspan="2" style="background: #000088; color: #ffff00;">MEUS LINKS FAVORITOS NA TEIA:</th>
      </tr>
      <tr>
        <td>&#128190; <a href="http://www.spacejam.com" style="color: #ffff00;">Space Jam Movie Site (1996)</a></td>
        <td>O site mais moderno do planeta!</td>
      </tr>
      <tr>
        <td>&#128269; <a href="http://www.altavista.digital.com" style="color: #00ffff;">Mecanismo AltaVista</a></td>
        <td>Pesquise tudo na Web</td>
      </tr>
      <tr>
        <td>&#127925; Arquivo MIDI dos Beatles</td>
        <td>Tocando ao fundo no Netscape</td>
      </tr>
    </table>

    <!-- Webring clássico -->
    <div style="margin-top: 24px; border: 1px solid #808080; padding: 8px; max-width: 440px; font-size: 12px; color: #aaa;">
      <font color="#ffff00"><b>[ O Anel da Web do Windows 95 ]</b></font><br>
      Esta página faz parte da Cyber-Aliança de 1995.<br>
      [ <a href="#" style="color: #00ff00;">&laquo; Anterior</a> | <a href="#" style="color: #00ff00;">Aleatório</a> | <a href="#" style="color: #00ff00;">Próximo &raquo;</a> ]
    </div>

    <p style="font-size: 11px; color: #888; margin-top: 20px;">
      Envie uma mensagem eletrônica para: marco95@geocities.com<br>
      Feito no Bloco de Notas com muito suor e cafeína!
    </p>
  </center>
</div>
      `,
    },

    'http://www.spacejam.com': {
      title: 'Space Jam - Warner Bros. 1996',
      html: `
<div style="background-color: #000000; background-image: radial-gradient(white 1px, transparent 1px); background-size: 24px 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; padding: 16px; min-height: 100%; text-align: center;">
  <div style="margin-bottom: 12px;">
    <font size="+3" color="#ffff00" style="font-weight: 900; letter-spacing: 2px;">SPACE</font>
    <font size="+3" color="#ff0000" style="font-weight: 900; letter-spacing: 2px;">JAM</font><br>
    <font size="-1" color="#00ffff">WARNER BROS. PICTURES (1996)</font>
  </div>

  <div style="font-size: 13px; color: #ff80ff; margin-bottom: 20px;">
    FEATURING MICHAEL JORDAN & BUGS BUNNY
  </div>

  <!-- Planetas de navegação do Space Jam -->
  <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; max-width: 520px; margin: 0 auto;">
    <div style="width: 110px; padding: 8px; background: rgba(0,0,128,0.7); border: 2px solid #00ffff; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#127936;</div>
      <b style="color: #ffff00; font-size: 12px;">Planet B-Ball</b>
      <div style="font-size: 10px; color: #ccc;">The ultimate matchup</div>
    </div>

    <div style="width: 110px; padding: 8px; background: rgba(128,0,0,0.7); border: 2px solid #ff0000; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#127916;</div>
      <b style="color: #ffff00; font-size: 12px;">Lunar Tunes</b>
      <div style="font-size: 10px; color: #ccc;">Meet the Looney crew</div>
    </div>

    <div style="width: 110px; padding: 8px; background: rgba(0,100,0,0.7); border: 2px solid #00ff00; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#127926;</div>
      <b style="color: #ffff00; font-size: 12px;">Jam Central</b>
      <div style="font-size: 10px; color: #ccc;">Soundtrack & clips</div>
    </div>

    <div style="width: 110px; padding: 8px; background: rgba(100,0,100,0.7); border: 2px solid #ff00ff; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#128640;</div>
      <b style="color: #ffff00; font-size: 12px;">Behind The Jam</b>
      <div style="font-size: 10px; color: #ccc;">Making the movie</div>
    </div>

    <div style="width: 110px; padding: 8px; background: rgba(100,100,0,0.7); border: 2px solid #ffff00; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#127873;</div>
      <b style="color: #ffff00; font-size: 12px;">Souvenirs</b>
      <div style="font-size: 10px; color: #ccc;">Screen savers & icons</div>
    </div>

    <div style="width: 110px; padding: 8px; background: rgba(50,50,50,0.7); border: 2px solid #ffffff; border-radius: 8px; cursor: pointer;">
      <div style="font-size: 24px;">&#128506;</div>
      <b style="color: #ffff00; font-size: 12px;">Site Map</b>
      <div style="font-size: 10px; color: #ccc;">Explore everything</div>
    </div>
  </div>

  <p style="margin-top: 24px; font-size: 12px; color: #aaa;">
    Voltar para: <a href="http://www.altavista.digital.com" style="color: #00ffff;">AltaVista Search</a> |
    <a href="http://www.geocities.com/siliconvalley/heights/9595" style="color: #ffff00;">GeoCities Silicon Valley</a>
  </p>

  <hr size="1" color="#444" style="margin-top: 20px;">
  <div style="font-size: 10px; color: #777;">
    SPACE JAM, characters, names, and all related indicia are trademarks of Warner Bros. &copy; 1996.
  </div>
</div>
      `,
    },
  };

  W95.Apps.register('ie', {
    title: 'Microsoft Internet Explorer',
    icon: 'ie',
    launch(args = {}) {
      let currentUrl = args.url || 'http://www.altavista.digital.com';
      const history = [currentUrl];
      let historyIndex = 0;
      let isLoading = false;

      // Barra de ferramentas clássica
      const btnBack = makeToolBtn('Voltar', 'ie_back', () => go(-1));
      const btnFwd = makeToolBtn('Avançar', 'ie_fwd', () => go(1));
      const btnStop = makeToolBtn('Parar', 'ie_stop', () => stopLoading());
      const btnRefresh = makeToolBtn('Atualizar', 'ie_refresh', () => loadUrl(currentUrl));
      const btnHome = makeToolBtn('Início', 'ie_home', () => navigate('http://www.altavista.digital.com'));
      const btnSearch = makeToolBtn('Pesquisar', 'ie_search', () => navigate('http://www.altavista.digital.com'));
      const btnFav = makeToolBtn('Favoritos', 'ie_fav', () => showFavorites());
      const btnPrint = makeToolBtn('Imprimir', 'ie_print', () => msgBox({ title: 'Imprimir', text: 'Enviando página para a impressora padrão...', icon: 'info', owner: win }));

      function makeToolBtn(label, icon, action) {
        return h('button.tool-btn', {
          title: label,
          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px', padding: '2px 4px', gap: '1px' },
          onclick: () => { W95.Sound.play('click'); action(); },
        }, W95.Icons.img(icon, 20), h('span', { text: label, style: { fontSize: '10px' } }));
      }

      // Globo animado do IE no canto superior direito
      const logoEl = h('div', {
        style: {
          width: '38px',
          height: '38px',
          boxShadow: 'var(--bevel-field)',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
          flexShrink: 0,
        },
      }, W95.Icons.img('ie', 32));

      // Barra de endereço
      const urlInput = h('input.field', {
        type: 'text',
        value: currentUrl,
        style: { flex: '1', height: '21px', padding: '2px 4px' },
      });

      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          let target = urlInput.value.trim();
          if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = 'http://' + target;
          }
          navigate(target);
        }
      });

      const addressRow = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 6px 4px', background: 'var(--face)' },
      }, h('span', { text: 'Endereço:' }), urlInput);

      const toolBar = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', background: 'var(--face)', borderBottom: '1px solid var(--shadow)' },
      }, btnBack, btnFwd, btnStop, btnRefresh, btnHome, h('div.hr-etched', { style: { width: '2px', height: '32px', margin: '0 4px' } }), btnSearch, btnFav, btnPrint, logoEl);

      // Visualizador web (viewport com iframe ou div embutido)
      const viewport = h('div.sunken-panel', {
        style: { flex: '1', overflow: 'auto', background: '#ffffff', position: 'relative' },
      });

      // Barra de status
      const statusText = h('div', { text: 'Concluído', style: { flex: '1' } });
      const statusBar = h('div.status-bar', null, statusText);

      function updateNavButtons() {
        btnBack.disabled = historyIndex <= 0;
        btnFwd.disabled = historyIndex >= history.length - 1;
      }

      function stopLoading() {
        isLoading = false;
        statusText.textContent = 'Cancelado';
        logoEl.innerHTML = '';
        logoEl.append(W95.Icons.img('ie', 32));
      }

      function navigate(url) {
        if (url !== currentUrl) {
          history.splice(historyIndex + 1);
          history.push(url);
          historyIndex = history.length - 1;
        }
        loadUrl(url);
      }

      function go(delta) {
        const next = historyIndex + delta;
        if (next >= 0 && next < history.length) {
          historyIndex = next;
          loadUrl(history[historyIndex]);
        }
      }

      function loadUrl(url) {
        currentUrl = url;
        urlInput.value = url;
        updateNavButtons();
        isLoading = true;
        statusText.textContent = `Localizando o site: ${url}...`;

        // Animação do logotipo
        let angle = 0;
        const spin = setInterval(() => {
          if (!isLoading) { clearInterval(spin); return; }
          angle = (angle + 45) % 360;
          logoEl.style.transform = `rotate(${angle}deg)`;
        }, 100);

        setTimeout(() => {
          isLoading = false;
          logoEl.style.transform = '';
          statusText.textContent = 'Concluído';

          const page = PAGES[url] || {
            title: '404 Não Encontrado',
            html: `
<div style="font-family: Arial, sans-serif; padding: 24px; color: #000;">
  <h2>Não é possível localizar a página</h2>
  <p>A página que você está procurando pode ter sido removida, teve seu nome alterado ou está temporariamente indisponível.</p>
  <hr>
  <p>Tente o seguinte:</p>
  <ul>
    <li>Verifique se o endereço foi digitado corretamente.</li>
    <li>Visite a <a href="http://www.altavista.digital.com" style="color: blue;">Página Principal do AltaVista</a>.</li>
    <li>Acesse a <a href="http://www.geocities.com/siliconvalley/heights/9595" style="color: blue;">Página do GeoCities</a>.</li>
    <li>Acesse o <a href="http://www.spacejam.com" style="color: blue;">Space Jam (1996)</a>.</li>
  </ul>
  <p style="font-size: 11px; color: #888;">HTTP 404 - Arquivo não encontrado<br>Internet Explorer</p>
</div>
            `,
          };

          win.setTitle(page.title + ' - Microsoft Internet Explorer');
          viewport.innerHTML = page.html;

          // Intercepta links na página interna
          viewport.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              const href = link.getAttribute('href');
              if (href && href.startsWith('http')) {
                navigate(href);
              }
            });
          });
        }, 350);
      }

      window.__ieSearch = (query) => {
        msgBox({
          title: 'Pesquisa AltaVista',
          text: `Resultados da pesquisa por "${query}":\n\n1. Windows 95 Service Pack 1\n2. The Unofficial Brian Eno Archive\n3. Space Jam World Wide Web Experience\n4. GeoCities Silicon Valley Directory`,
          icon: 'info',
          owner: win,
        });
      };

      function showFavorites() {
        const items = Object.keys(PAGES).map((url) => ({
          label: PAGES[url].title,
          action: () => navigate(url),
        }));
        W95.UI.Menu.open(items, { x: 120, y: 120, owner: win });
      }

      const menu = [
        {
          label: '&Arquivo',
          items: [
            { label: '&Abrir...', action: () => {
              W95.UI.prompt({ title: 'Abrir página', label: 'Digite o endereço (URL) da página web:', value: currentUrl, owner: win }).then((u) => {
                if (u) navigate(u);
              });
            } },
            { label: '&Salvar como...', action: () => msgBox({ title: 'Salvar', text: 'Página HTML salva no cache temporário.', icon: 'info', owner: win }) },
            '-',
            { label: '&Fechar', action: () => win.close() },
          ],
        },
        {
          label: '&Exibir',
          items: [
            { label: '&Atualizar', shortcut: 'F5', action: () => loadUrl(currentUrl) },
            { label: '&Parar', shortcut: 'Esc', action: stopLoading },
            '-',
            { label: '&Código-fonte', action: () => {
              W95.Apps.launch('notepad', { content: PAGES[currentUrl] ? PAGES[currentUrl].html : '<html>404</html>' });
            } },
          ],
        },
        {
          label: '&Favoritos',
          items: [
            { label: 'AltaVista Search', action: () => navigate('http://www.altavista.digital.com') },
            { label: 'GeoCities Silicon Valley', action: () => navigate('http://www.geocities.com/siliconvalley/heights/9595') },
            { label: 'Space Jam (1996)', action: () => navigate('http://www.spacejam.com') },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Sobre o Internet Explorer',
              action: () => {
                msgBox({
                  title: 'Sobre o Microsoft Internet Explorer',
                  text: 'Microsoft(R) Internet Explorer Versão 3.02\nCopyright (C) 1995-1996 Microsoft Corporation.\n\nSimulador Vintage Web de 1995.',
                  icon: 'info',
                  owner: win,
                });
              },
            },
          ],
        },
      ];

      const content = h('div', {
        style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%' },
      }, toolBar, addressRow, viewport, statusBar);

      const win = W95.WM.create({
        title: 'Microsoft Internet Explorer',
        icon: 'ie',
        menu,
        content,
        width: 680,
        height: 500,
        minWidth: 400,
        minHeight: 280,
        app: 'ie',
        onKey: (e) => {
          if (e.key === 'F5') { e.preventDefault(); loadUrl(currentUrl); }
        },
      });

      loadUrl(currentUrl);
      return win;
    },
  });
})();
