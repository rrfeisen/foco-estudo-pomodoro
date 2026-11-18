import { gerarId } from '../domain/sessionEngine';
import {
  SessaoAtiva,
  Tarefa,
  TemporizadorPersonalizado,
} from '../domain/types';
import {
  ehPresetPersistidoValido,
  ehSessaoPersistidaValida,
  ehTarefaPersistidaValida,
} from '../domain/validation';
import { CHAVES_STORAGE } from './storageKeys';

export interface ResultadoLeituraSessao {
  sessao: SessaoAtiva | null;
  inconsistente: boolean;
  mensagemErro?: string;
}

export interface ResultadoLeituraColecao<T> {
  itens: T[];
  avisoInconsistencia?: string;
}

function criarPresetsIniciais(): TemporizadorPersonalizado[] {
  const agora = Date.now();
  return [
    {
      id: gerarId(),
      nome: 'Pomodoro Clássico',
      tempoFocoMin: 25,
      tempoPausaCurtaMin: 5,
      ciclosAntesPausaLonga: 4,
      tempoPausaLongaMin: 15,
      criadoEm: agora,
      atualizadoEm: agora,
    },
    {
      id: gerarId(),
      nome: 'Estudo Profundo',
      tempoFocoMin: 50,
      tempoPausaCurtaMin: 10,
      ciclosAntesPausaLonga: 3,
      tempoPausaLongaMin: 20,
      criadoEm: agora + 1,
      atualizadoEm: agora + 1,
    },
  ];
}

export function carregarPresets(): ResultadoLeituraColecao<TemporizadorPersonalizado> {
  try {
    const bruto = window.localStorage.getItem(CHAVES_STORAGE.PRESETS);
    if (bruto === null) {
      const iniciais = criarPresetsIniciais();
      salvarPresets(iniciais);
      return { itens: iniciais };
    }

    const parseado: unknown = JSON.parse(bruto);
    if (!Array.isArray(parseado)) {
      return {
        itens: [],
        avisoInconsistencia:
          'Os dados de temporizadores salvos estavam em formato inválido e foram redefinidos.',
      };
    }

    const validos = parseado.filter(ehPresetPersistidoValido);
    if (validos.length !== parseado.length) {
      return {
        itens: validos,
        avisoInconsistencia:
          'Alguns temporizadores corrompidos no armazenamento local foram ignorados.',
      };
    }

    return { itens: validos };
  } catch {
    return {
      itens: [],
      avisoInconsistencia:
        'Não foi possível ler os temporizadores salvos no navegador.',
    };
  }
}

export function salvarPresets(
  presets: readonly TemporizadorPersonalizado[]
): string | null {
  try {
    window.localStorage.setItem(
      CHAVES_STORAGE.PRESETS,
      JSON.stringify(presets)
    );
    return null;
  } catch {
    return 'Falha ao salvar os temporizadores no Local Storage. Verifique o espaço disponível no navegador.';
  }
}

export function carregarTarefas(): ResultadoLeituraColecao<Tarefa> {
  try {
    const bruto = window.localStorage.getItem(CHAVES_STORAGE.TAREFAS);
    if (bruto === null) {
      return { itens: [] };
    }

    const parseado: unknown = JSON.parse(bruto);
    if (!Array.isArray(parseado)) {
      return {
        itens: [],
        avisoInconsistencia:
          'A lista de tarefas salva estava em formato inválido e foi reiniciada.',
      };
    }

    const validas = parseado.filter(ehTarefaPersistidaValida);
    if (validas.length !== parseado.length) {
      return {
        itens: validas,
        avisoInconsistencia:
          'Algumas tarefas com dados inconsistentes foram ignoradas ao carregar.',
      };
    }

    return { itens: validas };
  } catch {
    return {
      itens: [],
      avisoInconsistencia:
        'Não foi possível ler as tarefas salvas no Local Storage.',
    };
  }
}

export function salvarTarefas(tarefas: readonly Tarefa[]): string | null {
  try {
    window.localStorage.setItem(
      CHAVES_STORAGE.TAREFAS,
      JSON.stringify(tarefas)
    );
    return null;
  } catch {
    return 'Falha ao salvar as tarefas no Local Storage. Verifique as permissões ou o espaço do navegador.';
  }
}

/**
 * Carrega a sessão ativa aplicando validação de integridade (R-03).
 */
export function carregarSessaoAtiva(): ResultadoLeituraSessao {
  try {
    const bruto = window.localStorage.getItem(CHAVES_STORAGE.SESSAO_ATIVA);
    if (bruto === null) {
      return { sessao: null, inconsistente: false };
    }

    const parseado: unknown = JSON.parse(bruto);
    if (!ehSessaoPersistidaValida(parseado)) {
      return {
        sessao: null,
        inconsistente: true,
        mensagemErro:
          'A sessão salva no navegador está inconsistente ou corrompida. Deseja descartá-la?',
      };
    }

    return { sessao: parseado, inconsistente: false };
  } catch {
    return {
      sessao: null,
      inconsistente: true,
      mensagemErro:
        'Não foi possível restaurar a sessão anterior devido a dados corrompidos em Local Storage.',
    };
  }
}

export function salvarSessaoAtiva(sessao: SessaoAtiva): string | null {
  try {
    window.localStorage.setItem(
      CHAVES_STORAGE.SESSAO_ATIVA,
      JSON.stringify(sessao)
    );
    return null;
  } catch {
    return 'Falha ao persistir o estado da sessão ativa em Local Storage.';
  }
}

export function removerSessaoAtiva(): string | null {
  try {
    window.localStorage.removeItem(CHAVES_STORAGE.SESSAO_ATIVA);
    return null;
  } catch {
    return 'Falha ao remover a sessão ativa do Local Storage.';
  }
}
