import React, { useMemo } from 'react';
import {
  ArrowDownWideNarrow,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ordenarTarefas,
  ROTULOS_ESTADO_TAREFA,
  ROTULOS_PRIORIDADE_TAREFA,
} from '../domain/taskOrdering';
import { EstadoTarefa, Tarefa } from '../domain/types';
import { ESTADOS_TAREFA_VALIDOS } from '../domain/validation';

export interface TaskSidebarProps {
  tarefas: Tarefa[];
  aoCriarTarefa: () => void;
  aoEditarTarefa: (tarefa: Tarefa) => void;
  aoAlterarEstadoRapido: (tarefaId: string, novoEstado: EstadoTarefa) => void;
  aoSolicitarExcluirTarefa: (tarefa: Tarefa) => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  tarefas,
  aoCriarTarefa,
  aoEditarTarefa,
  aoAlterarEstadoRapido,
  aoSolicitarExcluirTarefa,
}) => {
  // RN-10 / RT-06: Ordenação fixa automática (Prioridade Alta->Baixa, Estado A fazer->Backlog)
  const tarefasOrdenadas = useMemo(() => ordenarTarefas(tarefas), [tarefas]);

  return (
    <aside
      className="painel-tarefas"
      aria-labelledby="titulo-painel-tarefas"
    >
      <div className="painel-tarefas-topo">
        <div>
          <h2 id="titulo-painel-tarefas" className="secao-titulo">
            Tarefas de Estudo
          </h2>
          <p className="painel-tarefas-subtitulo">
            <ArrowDownWideNarrow size={14} aria-hidden="true" />
            <span>
              Ordenadas por prioridade (Alta → Baixa) e estado de execução
            </span>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primario btn-compacto"
          onClick={aoCriarTarefa}
        >
          <Plus size={17} aria-hidden="true" />
          Nova Tarefa
        </button>
      </div>

      {tarefasOrdenadas.length === 0 ? (
        <div className="estado-vazio estado-vazio--tarefas">
          <ClipboardList
            size={34}
            aria-hidden="true"
            className="estado-vazio-icone"
          />
          <p className="estado-vazio-titulo">Nenhuma tarefa registrada</p>
          <p className="estado-vazio-texto">
            Organize os tópicos e exercícios que você pretende estudar nos
            próximos ciclos.
          </p>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={aoCriarTarefa}
          >
            <Plus size={16} aria-hidden="true" />
            Adicionar Primeira Tarefa
          </button>
        </div>
      ) : (
        <ul className="lista-tarefas" aria-label="Lista ordenada de tarefas">
          {tarefasOrdenadas.map((tarefa) => (
            <li
              key={tarefa.id}
              className={`card-tarefa card-tarefa--${tarefa.estado}`}
            >
              <div className="card-tarefa-cabecalho">
                <span
                  className={`badge-prioridade badge-prioridade--${tarefa.prioridade}`}
                >
                  Prioridade {ROTULOS_PRIORIDADE_TAREFA[tarefa.prioridade]}
                </span>

                <div className="card-tarefa-acoes">
                  <button
                    type="button"
                    className="btn-icone"
                    aria-label={`Editar tarefa ${tarefa.titulo}`}
                    title="Editar tarefa"
                    onClick={() => aoEditarTarefa(tarefa)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-icone btn-icone--perigo"
                    aria-label={`Excluir tarefa ${tarefa.titulo}`}
                    title="Excluir tarefa"
                    onClick={() => aoSolicitarExcluirTarefa(tarefa)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h3 className="card-tarefa-titulo">{tarefa.titulo}</h3>

              <div className="card-tarefa-rodape">
                <span
                  className={`badge-estado badge-estado--${tarefa.estado}`}
                >
                  {ROTULOS_ESTADO_TAREFA[tarefa.estado]}
                </span>

                <div className="troca-estado-rapida">
                  <label
                    htmlFor={`estado-tarefa-${tarefa.id}`}
                    className="sr-only"
                  >
                    Alterar estado de {tarefa.titulo}
                  </label>
                  <select
                    id={`estado-tarefa-${tarefa.id}`}
                    className="campo-select campo-select--mini"
                    value={tarefa.estado}
                    onChange={(e) =>
                      aoAlterarEstadoRapido(
                        tarefa.id,
                        e.target.value as EstadoTarefa
                      )
                    }
                  >
                    {ESTADOS_TAREFA_VALIDOS.map((est) => (
                      <option key={est} value={est}>
                        {ROTULOS_ESTADO_TAREFA[est]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
