import {
  FaseSessao,
  SessaoAtiva,
  SnapshotPreset,
  TemporizadorPersonalizado,
} from './types';

const MS_POR_MINUTO = 60_000;

export function gerarId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function obterDuracaoFaseMs(
  snapshot: SnapshotPreset,
  fase: FaseSessao
): number {
  switch (fase) {
    case 'foco':
      return snapshot.tempoFocoMin * MS_POR_MINUTO;
    case 'pausaCurta':
      return snapshot.tempoPausaCurtaMin * MS_POR_MINUTO;
    case 'pausaLonga':
      return snapshot.tempoPausaLongaMin * MS_POR_MINUTO;
  }
}

export function criarSnapshotPreset(
  preset: TemporizadorPersonalizado
): SnapshotPreset {
  return {
    nome: preset.nome,
    tempoFocoMin: preset.tempoFocoMin,
    tempoPausaCurtaMin: preset.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: preset.ciclosAntesPausaLonga,
    tempoPausaLongaMin: preset.tempoPausaLongaMin,
  };
}

/**
 * RN-01: Um preset em uso por sessão ativa (em andamento ou pausada) não pode ser editado nem excluído.
 */
export function presetEstaEmSessaoAtiva(
  presetId: string,
  sessaoAtiva: SessaoAtiva | null
): boolean {
  if (!sessaoAtiva) return false;
  if (sessaoAtiva.status === 'concluida') return false;
  return sessaoAtiva.presetId === presetId;
}

/**
 * UC04 / RN-05: Cria uma nova sessão ativa com snapshot dos parâmetros do preset no início.
 */
export function criarSessaoAtiva(
  preset: TemporizadorPersonalizado,
  agoraMs: number = Date.now()
): SessaoAtiva {
  const snapshot = criarSnapshotPreset(preset);
  const duracaoMs = obterDuracaoFaseMs(snapshot, 'foco');

  return {
    id: gerarId(),
    presetId: preset.id,
    snapshotPreset: snapshot,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + duracaoMs,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    criadaEm: agoraMs,
    atualizadaEm: agoraMs,
  };
}

/**
 * UC05 / RN-06: Pausa a sessão preservando o tempo restante da fase corrente.
 */
export function pausarSessao(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): SessaoAtiva {
  if (sessao.status !== 'emAndamento') {
    return sessao;
  }

  const restanteMs = Math.max(0, sessao.fimFasePrevistoEm - agoraMs);
  return {
    ...sessao,
    status: 'pausada',
    pausadaEm: agoraMs,
    tempoRestanteAoPausarMs: restanteMs,
    atualizadaEm: agoraMs,
  };
}

/**
 * UC05: Retoma uma sessão pausada recalculando o fim da fase a partir do instante da retomada.
 */
export function retomarSessao(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): SessaoAtiva {
  if (sessao.status !== 'pausada') {
    return sessao;
  }

  const restanteMs =
    sessao.tempoRestanteAoPausarMs ??
    obterDuracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual);

  return {
    ...sessao,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + restanteMs,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agoraMs,
  };
}

/**
 * Calcula a próxima fase em progressão natural (ao concluir a fase por tempo).
 * Retorna null quando todas as fases previstas na sessão foram concluídas.
 */
function proximaFasePorConclusaoNatural(
  snapshot: SnapshotPreset,
  faseAtual: FaseSessao,
  cicloAtual: number
): { fase: FaseSessao; ciclo: number } | null {
  if (faseAtual === 'foco') {
    const proximaFase: FaseSessao =
      cicloAtual >= snapshot.ciclosAntesPausaLonga
        ? 'pausaLonga'
        : 'pausaCurta';
    return { fase: proximaFase, ciclo: cicloAtual };
  }

  if (faseAtual === 'pausaCurta') {
    const proximoCiclo = cicloAtual + 1;
    if (proximoCiclo > snapshot.ciclosAntesPausaLonga) {
      return null;
    }
    return { fase: 'foco', ciclo: proximoCiclo };
  }

  // fim da pausaLonga encerra todos os ciclos previstos
  return null;
}

/**
 * UC06 / RN-03: Pula manualmente a fase atual sem contabilizá-la como concluída.
 * - Pular fase de foco NÃO incrementa a contagem de ciclos (RN-03).
 * - Pular fase de pausa NÃO incrementa a contagem de ciclos (RN-03).
 * - UC06 1a: Se a fase atual for a última antes da conclusão da sessão (pausaLonga), a sessão é encerrada.
 */
export function pularFase(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): { sessao: SessaoAtiva | null; encerradaPorUltimaFase: boolean } {
  if (sessao.status === 'concluida') {
    return { sessao, encerradaPorUltimaFase: false };
  }

  // UC06 1a: última fase prevista antes da conclusão da sessão
  if (sessao.faseAtual === 'pausaLonga') {
    return {
      sessao: null,
      encerradaPorUltimaFase: true,
    };
  }

  const proximaFase: FaseSessao =
    sessao.faseAtual === 'foco'
      ? sessao.cicloAtual >= sessao.snapshotPreset.ciclosAntesPausaLonga
        ? 'pausaLonga'
        : 'pausaCurta'
      : 'foco';

  const duracaoMs = obterDuracaoFaseMs(sessao.snapshotPreset, proximaFase);

  return {
    sessao: {
      ...sessao,
      faseAtual: proximaFase,
      // RN-03: cicloAtual nunca é incrementado ao pular foco ou pausa
      cicloAtual: sessao.cicloAtual,
      status: 'emAndamento',
      inicioFaseEm: agoraMs,
      fimFasePrevistoEm: agoraMs + duracaoMs,
      pausadaEm: null,
      tempoRestanteAoPausarMs: null,
      atualizadaEm: agoraMs,
    },
    encerradaPorUltimaFase: false,
  };
}

/**
 * UC07 / RN-04: Zera a contagem de ciclos e retorna ao primeiro ciclo de foco mantendo o preset ativo.
 */
export function reiniciarCiclos(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): SessaoAtiva {
  const duracaoMs = obterDuracaoFaseMs(sessao.snapshotPreset, 'foco');

  return {
    ...sessao,
    faseAtual: 'foco',
    cicloAtual: 1,
    status: 'emAndamento',
    inicioFaseEm: agoraMs,
    fimFasePrevistoEm: agoraMs + duracaoMs,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agoraMs,
  };
}

export interface ResultadoRecalculoSessao {
  sessao: SessaoAtiva;
  fasesAvancadas: number;
  concluiuAgora: boolean;
}

/**
 * UC10 / RN-06 / RN-07 / RN-08 / RNF-03 / R-05:
 * Recalcula o estado da sessão com base em timestamps absolutos.
 */
export function recalcularSessaoPorTimestamp(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): ResultadoRecalculoSessao {
  // RN-06: Sessão pausada retorna pausada sem avanço automático
  if (sessao.status === 'pausada' || sessao.status === 'concluida') {
    return {
      sessao,
      fasesAvancadas: 0,
      concluiuAgora: false,
    };
  }

  // Fase corrente ainda não venceu
  if (agoraMs < sessao.fimFasePrevistoEm) {
    return {
      sessao,
      fasesAvancadas: 0,
      concluiuAgora: false,
    };
  }

  // RN-07 / RN-08: Avança sequencialmente pelas fases vencidas
  let faseCursor: FaseSessao = sessao.faseAtual;
  let cicloCursor = sessao.cicloAtual;
  let inicioCursor = sessao.inicioFaseEm;
  let fimCursor = sessao.fimFasePrevistoEm;
  let fasesAvancadas = 0;

  // Limite de segurança para R-05 (no máximo 2 * 12 = 24 fases possíveis)
  const limiteSeguranca =
    sessao.snapshotPreset.ciclosAntesPausaLonga * 2 + 4;

  while (agoraMs >= fimCursor && fasesAvancadas < limiteSeguranca) {
    fasesAvancadas += 1;
    const proximo = proximaFasePorConclusaoNatural(
      sessao.snapshotPreset,
      faseCursor,
      cicloCursor
    );

    // RN-08: Todas as fases previstas venceram
    if (proximo === null) {
      return {
        sessao: {
          ...sessao,
          faseAtual: faseCursor,
          cicloAtual: cicloCursor,
          status: 'concluida',
          inicioFaseEm: inicioCursor,
          fimFasePrevistoEm: fimCursor,
          pausadaEm: null,
          tempoRestanteAoPausarMs: null,
          atualizadaEm: agoraMs,
        },
        fasesAvancadas,
        concluiuAgora: true,
      };
    }

    faseCursor = proximo.fase;
    cicloCursor = proximo.ciclo;
    inicioCursor = fimCursor;
    fimCursor =
      inicioCursor + obterDuracaoFaseMs(sessao.snapshotPreset, faseCursor);
  }

  return {
    sessao: {
      ...sessao,
      faseAtual: faseCursor,
      cicloAtual: cicloCursor,
      status: 'emAndamento',
      inicioFaseEm: inicioCursor,
      fimFasePrevistoEm: fimCursor,
      pausadaEm: null,
      tempoRestanteAoPausarMs: null,
      atualizadaEm: agoraMs,
    },
    fasesAvancadas,
    concluiuAgora: false,
  };
}

export function obterTempoRestanteMs(
  sessao: SessaoAtiva,
  agoraMs: number = Date.now()
): number {
  if (sessao.status === 'concluida') {
    return 0;
  }
  if (sessao.status === 'pausada') {
    return Math.max(0, sessao.tempoRestanteAoPausarMs ?? 0);
  }
  return Math.max(0, sessao.fimFasePrevistoEm - agoraMs);
}

export function formatarTempoMmSs(tempoMs: number): string {
  const totalSegundos = Math.max(0, Math.ceil(tempoMs / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

export function rotuloFase(fase: FaseSessao): string {
  switch (fase) {
    case 'foco':
      return 'Foco';
    case 'pausaCurta':
      return 'Pausa Curta';
    case 'pausaLonga':
      return 'Pausa Longa';
  }
}
