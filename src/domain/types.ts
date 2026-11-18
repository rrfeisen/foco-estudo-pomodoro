export interface TemporizadorPersonalizado {
  id: string;
  nome: string;
  tempoFocoMin: number;
  tempoPausaCurtaMin: number;
  ciclosAntesPausaLonga: number;
  tempoPausaLongaMin: number;
  criadoEm: number;
  atualizadoEm: number;
}

export interface SnapshotPreset {
  nome: string;
  tempoFocoMin: number;
  tempoPausaCurtaMin: number;
  ciclosAntesPausaLonga: number;
  tempoPausaLongaMin: number;
}

export type FaseSessao = 'foco' | 'pausaCurta' | 'pausaLonga';

export type StatusSessao = 'emAndamento' | 'pausada' | 'concluida';

export interface SessaoAtiva {
  id: string;
  presetId: string;
  snapshotPreset: SnapshotPreset;
  faseAtual: FaseSessao;
  cicloAtual: number;
  ciclosConcluidos?: number;
  focoConcluidoNoCiclo?: boolean;
  status: StatusSessao;
  inicioFaseEm: number;
  fimFasePrevistoEm: number;
  pausadaEm: number | null;
  tempoRestanteAoPausarMs: number | null;
  criadaEm: number;
  atualizadaEm: number;
}

export type EstadoTarefa =
  | 'backlog'
  | 'aFazer'
  | 'emExecucao'
  | 'concluida'
  | 'cancelada';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta';

export interface Tarefa {
  id: string;
  titulo: string;
  estado: EstadoTarefa;
  prioridade: PrioridadeTarefa;
  criadaEm: number;
  atualizadaEm: number;
}

export interface DadosFormularioPreset {
  nome: string;
  tempoFocoMin: string | number;
  tempoPausaCurtaMin: string | number;
  ciclosAntesPausaLonga: string | number;
  tempoPausaLongaMin: string | number;
}

export interface DadosFormularioTarefa {
  titulo: string;
  estado: EstadoTarefa;
  prioridade: PrioridadeTarefa;
}
