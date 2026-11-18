import { EstadoTarefa, PrioridadeTarefa, Tarefa } from './types';

const PESO_PRIORIDADE: Record<PrioridadeTarefa, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

/**
 * RN-10: A ordenação do painel de tarefas é fixa:
 * 1) Prioridade em ordem decrescente: alta, média, baixa
 * 2) Estado na ordem: a fazer, em execução, concluída, cancelada, backlog
 */
const PESO_ESTADO: Record<EstadoTarefa, number> = {
  aFazer: 0,
  emExecucao: 1,
  concluida: 2,
  cancelada: 3,
  backlog: 4,
};

export function ordenarTarefas(tarefas: readonly Tarefa[]): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    const diffPrioridade =
      PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];
    if (diffPrioridade !== 0) {
      return diffPrioridade;
    }

    const diffEstado = PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado];
    if (diffEstado !== 0) {
      return diffEstado;
    }

    return a.criadaEm - b.criadaEm;
  });
}

export const ROTULOS_ESTADO_TAREFA: Record<EstadoTarefa, string> = {
  backlog: 'Backlog',
  aFazer: 'A fazer',
  emExecucao: 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const DESCRICOES_ESTADO_TAREFA: Record<EstadoTarefa, string> = {
  backlog: 'Capturada para depois, sem compromisso imediato',
  aFazer: 'Comprometida para os próximos ciclos',
  emExecucao: 'Trabalhando nesta tarefa agora',
  concluida: 'Tarefa finalizada',
  cancelada: 'Abandonada sem conclusão',
};

export const ROTULOS_PRIORIDADE_TAREFA: Record<PrioridadeTarefa, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
