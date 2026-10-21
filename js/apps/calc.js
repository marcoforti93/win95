/* ==========================================================================
   CALC.JS — Calculadora clássica do Windows 95 (calc.exe)
   --------------------------------------------------------------------------
   - Visual fiel com botões chanfrados 3D e display LCD afundado
   - Suporte completo a teclado numérico e atalhos
   - Operações: +, -, *, /, raiz quadrada (sqrt), porcentagem (%), inverso (1/x), +/-
   - Memória clássica: MC, MR, MS, M+ com indicador 'M'
   - Menus Editar (Copiar, Colar), Exibir e Ajuda
   ========================================================================== */
(function () {
  'use strict';
  const W95 = (window.W95 = window.W95 || {});
  const { h, msgBox } = W95.UI;

  W95.Apps.register('calc', {
    title: 'Calculadora',
    icon: 'calc',
    singleton: true,
    launch() {
      let displayValue = '0';
      let operand = null;
      let operator = null;
      let awaitingNewInput = false;
      let memory = 0;

      const displayEl = h('div.field', {
        text: '0.',
        style: {
          height: '24px',
          textAlign: 'right',
          fontFamily: 'var(--font)',
          fontSize: '13px',
          padding: '2px 4px',
          letterSpacing: '0.5px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          marginBottom: '6px',
        },
      });

      const memIndicator = h('div.sunken-panel', {
        style: {
          width: '24px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          background: 'var(--face)',
        },
      });

      function updateDisplay() {
        let v = displayValue;
        if (!v.includes('.')) v += '.';
        displayEl.textContent = v;
        memIndicator.textContent = memory !== 0 ? 'M' : '';
      }

      function inputDigit(d) {
        if (awaitingNewInput) {
          displayValue = d;
          awaitingNewInput = false;
        } else {
          displayValue = displayValue === '0' ? d : displayValue + d;
        }
        updateDisplay();
      }

      function inputDot() {
        if (awaitingNewInput) {
          displayValue = '0.';
          awaitingNewInput = false;
        } else if (!displayValue.includes('.')) {
          displayValue += '.';
        }
        updateDisplay();
      }

      function clearAll() {
        displayValue = '0';
        operand = null;
        operator = null;
        awaitingNewInput = false;
        updateDisplay();
      }

      function clearEntry() {
        displayValue = '0';
        updateDisplay();
      }

      function backspace() {
        if (awaitingNewInput) return;
        displayValue = displayValue.slice(0, -1);
        if (displayValue === '' || displayValue === '-') displayValue = '0';
        updateDisplay();
      }

      function toggleSign() {
        const v = parseFloat(displayValue);
        displayValue = String(-v);
        updateDisplay();
      }

      function handleOperator(nextOp) {
        const current = parseFloat(displayValue);
        if (operator && awaitingNewInput) {
          operator = nextOp;
          return;
        }
        if (operand === null) {
          operand = current;
        } else if (operator) {
          const result = compute(operand, current, operator);
          if (result === null) return;
          displayValue = String(result);
          operand = result;
          updateDisplay();
        }
        awaitingNewInput = true;
        operator = nextOp;
      }

      function compute(a, b, op) {
        let res = 0;
        switch (op) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) {
              msgBox({ title: 'Calculadora', text: 'Não é possível dividir por zero.', icon: 'warning', owner: win });
              clearAll();
              return null;
            }
            res = a / b;
            break;
          default: return b;
        }
        return parseFloat(res.toPrecision(12));
      }

      function equals() {
        if (operator === null) return;
        const current = parseFloat(displayValue);
        const result = compute(operand, current, operator);
        if (result === null) return;
        displayValue = String(result);
        operand = null;
        operator = null;
        awaitingNewInput = true;
        updateDisplay();
      }

      function sqrt() {
        const v = parseFloat(displayValue);
        if (v < 0) {
          msgBox({ title: 'Calculadora', text: 'Entrada inválida para função.', icon: 'warning', owner: win });
          return;
        }
        displayValue = String(parseFloat(Math.sqrt(v).toPrecision(12)));
        awaitingNewInput = true;
        updateDisplay();
      }

      function inverse() {
        const v = parseFloat(displayValue);
        if (v === 0) {
          msgBox({ title: 'Calculadora', text: 'Não é possível dividir por zero.', icon: 'warning', owner: win });
          return;
        }
        displayValue = String(parseFloat((1 / v).toPrecision(12)));
        awaitingNewInput = true;
        updateDisplay();
      }

      function percent() {
        if (operand === null) {
          displayValue = '0';
        } else {
          const v = parseFloat(displayValue);
          displayValue = String((operand * v) / 100);
        }
        updateDisplay();
      }

      // Memória
      function memClear() { memory = 0; updateDisplay(); }
      function memRecall() { displayValue = String(memory); awaitingNewInput = true; updateDisplay(); }
      function memStore() { memory = parseFloat(displayValue); awaitingNewInput = true; updateDisplay(); }
      function memAdd() { memory += parseFloat(displayValue); awaitingNewInput = true; updateDisplay(); }

      function makeBtn(label, action, color = null, minW = 32, minH = 26) {
        return h('button.btn', {
          text: label,
          style: {
            minWidth: minW + 'px',
            minHeight: minH + 'px',
            padding: '0 4px',
            color: color || '#000080',
            fontWeight: 'bold',
            fontSize: '11px',
          },
          onclick: (e) => {
            e.stopPropagation();
            W95.Sound.play('click');
            action();
          },
        });
      }

      // Painéis de botões
      const topRow = h('div', { style: { display: 'flex', gap: '6px', marginBottom: '6px' } },
        memIndicator,
        h('div', { style: { flex: '1' } }),
        makeBtn('Retrocesso', backspace, '#800000', 70, 24),
        makeBtn('CE', clearEntry, '#800000', 44, 24),
        makeBtn('C', clearAll, '#800000', 44, 24)
      );

      const memCol = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
        makeBtn('MC', memClear, '#ff0000', 32, 25),
        makeBtn('MR', memRecall, '#ff0000', 32, 25),
        makeBtn('MS', memStore, '#ff0000', 32, 25),
        makeBtn('M+', memAdd, '#ff0000', 32, 25)
      );

      const keyGrid = h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 34px)',
          gap: '4px',
          flex: '1',
        },
      },
        makeBtn('7', () => inputDigit('7'), '#000080'),
        makeBtn('8', () => inputDigit('8'), '#000080'),
        makeBtn('9', () => inputDigit('9'), '#000080'),
        makeBtn('/', () => handleOperator('/'), '#ff0000'),
        makeBtn('sqrt', sqrt, '#000080'),

        makeBtn('4', () => inputDigit('4'), '#000080'),
        makeBtn('5', () => inputDigit('5'), '#000080'),
        makeBtn('6', () => inputDigit('6'), '#000080'),
        makeBtn('*', () => handleOperator('*'), '#ff0000'),
        makeBtn('%', percent, '#000080'),

        makeBtn('1', () => inputDigit('1'), '#000080'),
        makeBtn('2', () => inputDigit('2'), '#000080'),
        makeBtn('3', () => inputDigit('3'), '#000080'),
        makeBtn('-', () => handleOperator('-'), '#ff0000'),
        makeBtn('1/x', inverse, '#000080'),

        makeBtn('0', () => inputDigit('0'), '#000080'),
        makeBtn('+/-', toggleSign, '#000080'),
        makeBtn('.', inputDot, '#000080'),
        makeBtn('+', () => handleOperator('+'), '#ff0000'),
        makeBtn('=', equals, '#ff0000')
      );

      const buttonsArea = h('div', { style: { display: 'flex', gap: '8px' } }, memCol, keyGrid);
      const container = h('div', { style: { padding: '8px', background: 'var(--face)' } }, displayEl, topRow, buttonsArea);

      const menu = [
        {
          label: '&Editar',
          items: [
            {
              label: '&Copiar',
              shortcut: 'Ctrl+C',
              action: () => navigator.clipboard && navigator.clipboard.writeText(displayValue),
            },
            {
              label: 'C&olar',
              shortcut: 'Ctrl+V',
              action: async () => {
                if (navigator.clipboard) {
                  const t = await navigator.clipboard.readText();
                  const n = parseFloat(t);
                  if (!isNaN(n)) {
                    displayValue = String(n);
                    awaitingNewInput = true;
                    updateDisplay();
                  }
                }
              },
            },
          ],
        },
        {
          label: 'E&xibir',
          items: [
            { label: '&Padrão', checked: true, action: () => {} },
            {
              label: '&Científica',
              action: () => msgBox({ title: 'Calculadora', text: 'O modo Científico não está disponível nesta versão.', icon: 'info', owner: win }),
            },
          ],
        },
        {
          label: 'A&juda',
          items: [
            {
              label: '&Tópicos da Ajuda',
              action: () => msgBox({ title: 'Ajuda da Calculadora', text: 'A Calculadora executa operações aritméticas básicas e funções de memória.', icon: 'info', owner: win }),
            },
            '-',
            {
              label: '&Sobre a Calculadora',
              action: () => msgBox({ title: 'Sobre a Calculadora', text: 'Microsoft(R) Windows 95\nCalculadora Versão 4.0\nCopyright (C) 1985-1995 Microsoft Corp.', icon: 'info', owner: win }),
            },
          ],
        },
      ];

      const win = W95.WM.create({
        title: 'Calculadora',
        icon: 'calc',
        menu,
        content: container,
        resizable: false,
        maximizable: false,
        width: 'auto',
        height: 'auto',
        app: 'calc',
        onKey: (e) => {
          if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); e.preventDefault(); }
          else if (e.key === '.' || e.key === ',') { inputDot(); e.preventDefault(); }
          else if (e.key === '+') { handleOperator('+'); e.preventDefault(); }
          else if (e.key === '-') { handleOperator('-'); e.preventDefault(); }
          else if (e.key === '*') { handleOperator('*'); e.preventDefault(); }
          else if (e.key === '/') { handleOperator('/'); e.preventDefault(); }
          else if (e.key === 'Enter' || e.key === '=') { equals(); e.preventDefault(); }
          else if (e.key === 'Backspace') { backspace(); e.preventDefault(); }
          else if (e.key === 'Escape') { clearAll(); e.preventDefault(); }
        },
      });

      return win;
    },
  });
})();
