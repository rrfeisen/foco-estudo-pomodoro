import {
  DadosFormularioPreset,
  DadosFormularioTarefa,
  EstadoTarefa,
  FaseSessao,
  PrioridadeTarefa,
  SessaoAtiva,
  SnapshotPreset,
  StatusSessao,
  Tarefa,
  TemporizadorPersonalizado,
} from './types';

export interface ErrosPreset {
  nome?: string;
  tempoFocoMin?: string;
  tempoPausaCurtaMin?: string;
  ciclosAntesPausaLonga?: string;
  tempoPausaLongaMin?: string;
}

export interface ResultadoValidacaoPreset {
  valido: boolean;
  erros: ErrosPreset;
  dados?: {
    nome: string;
    tempoFocoMin: number;
    tempoPausaCurtaMin: number;
    ciclosAntesPausaLonga: number;
    tempoPausaLongaMin: number;
  };
}

export interface ErrosTarefa {
  titulo?: string;
  estado?: string;
  prioridade?: string;
}

export interface ResultadoValidacaoTarefa {
  valido: boolean;
  erros: ErrosTarefa;
  dados?: {
    titulo: string;
    estado: EstadoTarefa;
    prioridade: PrioridadeTarefa;
  };
}

export const ESTADOS_TAREFA_VALIDOS: readonly EstadoTarefa[] = [
  'backlog',
  'aFazer',
  'emExecucao',
  'concluida',
  'cancelada',
];

export const PRIORIDADES_TAREFA_VALIDAS: readonly PrioridadeTarefa[] = [
  'baixa',
  'media',
  'alta',
];

const FASES_SESSAO_VALIDAS: readonly FaseSessao[] = [
  'foco',
  'pausaCurta',
  'pausaLonga',
];

const STATUS_SESSAO_VALIDOS: readonly StatusSessao[] = [
  'emAndamento',
  'pausada',
  'concluida',
];

function lerInteiroEstrito(valor: string | number): number | null {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? valor : null;
  }
  const limpo = valor.trim();
  if (limpo === '' || !/^-?\d+$/.test(limpo)) {
    return null;
  }
  const numero = Number(limpo);
  return Number.isSafeInteger(numero) ? numero : null;
}

/**
 * Valida entradas de criação/edição de preset conforme VR-01 a VR-05.
 */
export function validarDadosPreset(
  entrada: DadosFormularioPreset
): ResultadoValidacaoPreset {
  const erros: ErrosPreset = {};
  const nomeLimpo = entrada.nome.trim();

  // VR-01: Nome do preset: obrigatório, entre 1 e 40 caracteres
  if (nomeLimpo.length === 0) {
    erros.nome = 'O nome do temporizador é obrigatório.';
  } else if (nomeLimpo.length > 40) {
    erros.nome = 'O nome deve ter entre 1 e 40 caracteres.';
  }

  // VR-02: Tempo de foco: inteiro entre 1 e 120 minutos
  const tempoFocoMin = lerInteiroEstrito(entrada.tempoFocoMin);
  if (String(entrada.tempoFocoMin).trim() === '') {
    erros.tempoFocoMin = 'Informe o tempo de foco.';
  } else if (tempoFocoMin === null || tempoFocoMin < 1 || tempoFocoMin > 120) {
    erros.tempoFocoMin =
      'O tempo de foco deve ser um número inteiro entre 1 e 120 minutos.';
  }

  // VR-03: Tempo de pausa curta: inteiro entre 1 e 60 minutos
  const tempoPausaCurtaMin = lerInteiroEstrito(entrada.tempoPausaCurtaMin);
  if (String(entrada.tempoPausaCurtaMin).trim() === '') {
    erros.tempoPausaCurtaMin = 'Informe o tempo de pausa curta.';
  } else if (
    tempoPausaCurtaMin === null ||
    tempoPausaCurtaMin < 1 ||
    tempoPausaCurtaMin > 60
  ) {
    erros.tempoPausaCurtaMin =
      'A pausa curta deve ser um número inteiro entre 1 e 60 minutos.';
  }

  // VR-04: Quantidade de ciclos antes da pausa longa: inteiro entre 1 e 12
  const ciclosAntesPausaLonga = lerInteiroEstrito(
    entrada.ciclosAntesPausaLonga
  );
  if (String(entrada.ciclosAntesPausaLonga).trim() === '') {
    erros.ciclosAntesPausaLonga = 'Informe a quantidade de ciclos.';
  } else if (
    ciclosAntesPausaLonga === null ||
    ciclosAntesPausaLonga < 1 ||
    ciclosAntesPausaLonga > 12
  ) {
    erros.ciclosAntesPausaLonga =
      'A quantidade de ciclos deve ser um número inteiro entre 1 e 12.';
  }

  // VR-05: Tempo de pausa longa: inteiro entre 1 e 60 minutos
  const tempoPausaLongaMin = lerInteiroEstrito(entrada.tempoPausaLongaMin);
  if (String(entrada.tempoPausaLongaMin).trim() === '') {
    erros.tempoPausaLongaMin = 'Informe o tempo de pausa longa.';
  } else if (
    tempoPausaLongaMin === null ||
    tempoPausaLongaMin < 1 ||
    tempoPausaLongaMin > 60
  ) {
    erros.tempoPausaLongaMin =
      'A pausa longa deve ser um número inteiro entre 1 e 60 minutos.';
  }

  const valido = Object.keys(erros).length === 0;
  if (!valido) {
    return { valido: false, erros };
  }

  return {
    valido: true,
    erros: {},
    dados: {
      nome: nomeLimpo,
      tempoFocoMin: tempoFocoMin!,
      tempoPausaCurtaMin: tempoPausaCurtaMin!,
      ciclosAntesPausaLonga: ciclosAntesPausaLonga!,
      tempoPausaLongaMin: tempoPausaLongaMin!,
    },
  };
}

/**
 * Valida entradas de criação/edição de tarefa conforme VR-06 a VR-08.
 */
export function validarDadosTarefa(
  entrada: DadosFormularioTarefa
): ResultadoValidacaoTarefa {
  const erros: ErrosTarefa = {};
  const tituloLimpo = entrada.titulo.trim();

  // VR-06: Título da tarefa: obrigatório, entre 1 e 100 caracteres
  if (tituloLimpo.length === 0) {
    erros.titulo = 'O título da tarefa é obrigatório.';
  } else if (tituloLimpo.length > 100) {
    erros.titulo = 'O título deve ter entre 1 e 100 caracteres.';
  }

  // VR-07: Estado da tarefa
  if (!ESTADOS_TAREFA_VALIDOS.includes(entrada.estado)) {
    erros.estado = 'Selecione um estado válido para a tarefa.';
  }

  // VR-08: Prioridade da tarefa
  if (!PRIORIDADES_TAREFA_VALIDAS.includes(entrada.prioridade)) {
    erros.prioridade = 'Selecione uma prioridade válida para a tarefa.';
  }

  const valido = Object.keys(erros).length === 0;
  if (!valido) {
    return { valido: false, erros };
  }

  return {
    valido: true,
    erros: {},
    dados: {
      titulo: tituloLimpo,
      estado: entrada.estado,
      prioridade: entrada.prioridade,
    },
  };
}

function ehTimestampValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

function ehSnapshotValido(valor: unknown): valor is SnapshotPreset {
  if (!valor || typeof valor !== 'object') return false;
  const s = valor as Record<string, unknown>;
  return (
    typeof s.nome === 'string' &&
    s.nome.trim().length >= 1 &&
    s.nome.trim().length <= 40 &&
    typeof s.tempoFocoMin === 'number' &&
    Number.isInteger(s.tempoFocoMin) &&
    s.tempoFocoMin >= 1 &&
    s.tempoFocoMin <= 120 &&
    typeof s.tempoPausaCurtaMin === 'number' &&
    Number.isInteger(s.tempoPausaCurtaMin) &&
    s.tempoPausaCurtaMin >= 1 &&
    s.tempoPausaCurtaMin <= 60 &&
    typeof s.ciclosAntesPausaLonga === 'number' &&
    Number.isInteger(s.ciclosAntesPausaLonga) &&
    s.ciclosAntesPausaLonga >= 1 &&
    s.ciclosAntesPausaLonga <= 12 &&
    typeof s.tempoPausaLongaMin === 'number' &&
    Number.isInteger(s.tempoPausaLongaMin) &&
    s.tempoPausaLongaMin >= 1 &&
    s.tempoPausaLongaMin <= 60
  );
}

/**
 * Mitigação R-03: Valida estrutura de preset persistido em Local Storage.
 */
export function ehPresetPersistidoValido(
  valor: unknown
): valor is TemporizadorPersonalizado {
  if (!valor || typeof valor !== 'object') return false;
  const p = valor as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    ehSnapshotValido(p) &&
    ehTimestampValido(p.criadoEm) &&
    ehTimestampValido(p.atualizadoEm)
  );
}

/**
 * Mitigação R-03: Valida estrutura de tarefa persistida em Local Storage.
 */
export function ehTarefaPersistidaValida(valor: unknown): valor is Tarefa {
  if (!valor || typeof valor !== 'object') return false;
  const t = valor as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    t.id.length > 0 &&
    typeof t.titulo === 'string' &&
    t.titulo.trim().length >= 1 &&
    t.titulo.trim().length <= 100 &&
    ESTADOS_TAREFA_VALIDOS.includes(t.estado as EstadoTarefa) &&
    PRIORIDADES_TAREFA_VALIDAS.includes(t.prioridade as PrioridadeTarefa) &&
    ehTimestampValido(t.criadaEm) &&
    ehTimestampValido(t.atualizadaEm)
  );
}

/**
 * Mitigação R-03: Valida estrutura de sessão ativa persistida em Local Storage.
 */
export function ehSessaoPersistidaValida(valor: unknown): valor is SessaoAtiva {
  if (!valor || typeof valor !== 'object') return false;
  const s = valor as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.length === 0) return false;
  if (typeof s.presetId !== 'string' || s.presetId.length === 0) return false;
  if (!ehSnapshotValido(s.snapshotPreset)) return false;
  if (!FASES_SESSAO_VALIDAS.includes(s.faseAtual as FaseSessao)) return false;
  if (!STATUS_SESSAO_VALIDOS.includes(s.status as StatusSessao)) return false;
  if (
    typeof s.cicloAtual !== 'number' ||
    !Number.isInteger(s.cicloAtual) ||
    s.cicloAtual < 1 ||
    s.cicloAtual > s.snapshotPreset.ciclosAntesPausaLonga
  ) {
    return false;
  }
  if (!ehTimestampValido(s.inicioFaseEm)) return false;
  if (!ehTimestampValido(s.fimFasePrevistoEm)) return false;
  if (s.fimFasePrevistoEm < s.inicioFaseEm) return false;
  if (!ehTimestampValido(s.criadaEm) || !ehTimestampValido(s.atualizadaEm)) {
    return false;
  }

  if (s.status === 'pausada') {
    if (!ehTimestampValido(s.pausadaEm)) return false;
    if (
      typeof s.tempoRestanteAoPausarMs !== 'number' ||
      !Number.isFinite(s.tempoRestanteAoPausarMs) ||
      s.tempoRestanteAoPausarMs < 0
    ) {
      return false;
    }
  } else {
    if (s.pausadaEm !== null && !ehTimestampValido(s.pausadaEm)) return false;
    if (
      s.tempoRestanteAoPausarMs !== null &&
      typeof s.tempoRestanteAoPausarMs !== 'number'
    ) {
      return false;
    }
  }

  return true;
}
