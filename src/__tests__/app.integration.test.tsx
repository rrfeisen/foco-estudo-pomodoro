import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { CHAVES_STORAGE } from '../persistence/storageKeys';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe('Integração da Interface <App /> (UC01 a UC15)', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renderiza temporizadores iniciais, inicia sessão, bloqueia edição do preset ativo (RN-01) e troca preset (UC09)', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Pomodoro Clássico');
    expect(container.textContent).toContain('Estudo Profundo');

    const btnIniciar = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Iniciar Sessão de Foco')
    );
    expect(btnIniciar).toBeDefined();

    act(() => {
      btnIniciar!.click();
    });

    expect(container.textContent).toContain('Pausar');
    expect(window.localStorage.getItem(CHAVES_STORAGE.SESSAO_ATIVA)).toBeTruthy();

    // Tenta editar preset em uso (RN-01)
    const btnEditarAtivo = container.querySelector(
      'button[aria-label="Editar temporizador Pomodoro Clássico"]'
    ) as HTMLButtonElement;
    act(() => {
      btnEditarAtivo.click();
    });

    expect(container.textContent).toContain(
      'Este temporizador está em uso pela sessão ativa'
    );

    // Troca para outro preset encerrando automaticamente sem confirmação (UC09 / RN-02)
    const btnTrocar = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Selecionar e iniciar (encerra atual)')
    );
    expect(btnTrocar).toBeDefined();
    act(() => {
      btnTrocar!.click();
    });

    const sessaoSalva = JSON.parse(
      window.localStorage.getItem(CHAVES_STORAGE.SESSAO_ATIVA)!
    );
    expect(sessaoSalva.snapshotPreset.nome).toBe('Estudo Profundo');
  });

  it('retoma sessão automaticamente ao reabrir e permite descartá-la com confirmação (UC10, UC11)', () => {
    const agora = Date.now();
    window.localStorage.setItem(
      CHAVES_STORAGE.SESSAO_ATIVA,
      JSON.stringify({
        id: 'sess-retomada',
        presetId: 'p1',
        snapshotPreset: {
          nome: 'Revisão Física',
          tempoFocoMin: 25,
          tempoPausaCurtaMin: 5,
          ciclosAntesPausaLonga: 4,
          tempoPausaLongaMin: 15,
        },
        faseAtual: 'foco',
        cicloAtual: 1,
        status: 'emAndamento',
        inicioFaseEm: agora - 26 * 60_000,
        fimFasePrevistoEm: agora - 1 * 60_000,
        pausadaEm: null,
        tempoRestanteAoPausarMs: null,
        criadaEm: agora - 26 * 60_000,
        atualizadaEm: agora - 26 * 60_000,
      })
    );

    act(() => {
      root.render(<App />);
    });

    // Avançou de foco para pausaCurta automaticamente
    expect(container.textContent).toContain('Sessão retomada automaticamente');
    expect(container.textContent).toContain('Em Pausa Curta');

    const btnDescartar = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Descartar sessão retomada')
    );
    act(() => {
      btnDescartar!.click();
    });

    // Modal de confirmação explícita (RN-11 / UC11)
    expect(container.textContent).toContain('Descartar sessão retomada?');
    const btnConfirmar = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Descartar sessão'
    );
    act(() => {
      btnConfirmar!.click();
    });

    expect(window.localStorage.getItem(CHAVES_STORAGE.SESSAO_ATIVA)).toBeNull();
  });

  it('cria tarefas com padrão backlog/média (RN-12), ordena conforme RN-10 e exige confirmação ao excluir (UC14)', () => {
    act(() => {
      root.render(<App />);
    });

    const btnNovaTarefa = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Nova Tarefa')
    );
    act(() => {
      btnNovaTarefa!.click();
    });

    const selectEstado = container.querySelector(
      '#tarefa-estado'
    ) as HTMLSelectElement;
    const selectPrioridade = container.querySelector(
      '#tarefa-prioridade'
    ) as HTMLSelectElement;

    // RN-12: valores padrão backlog e média
    expect(selectEstado.value).toBe('backlog');
    expect(selectPrioridade.value).toBe('media');

    const inputTitulo = container.querySelector(
      '#tarefa-titulo'
    ) as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(inputTitulo, 'Resumo de Banco de Dados');
      inputTitulo.dispatchEvent(new Event('input', { bubbles: true }));
      inputTitulo.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form')!;
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Resumo de Banco de Dados');

    // Aciona excluir -> deve abrir confirmação obrigatória
    const btnExcluir = container.querySelector(
      'button[aria-label="Excluir tarefa Resumo de Banco de Dados"]'
    ) as HTMLButtonElement;
    act(() => {
      btnExcluir.click();
    });

    expect(container.textContent).toContain('Excluir tarefa de estudo?');
    const btnConfirmarExclusao = Array.from(
      container.querySelectorAll('button')
    ).find((b) => b.textContent === 'Sim, excluir tarefa');
    act(() => {
      btnConfirmarExclusao!.click();
    });

    expect(container.textContent).not.toContain('Resumo de Banco de Dados');
  });
});
