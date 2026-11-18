import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  DESCRICOES_ESTADO_TAREFA,
  ROTULOS_ESTADO_TAREFA,
  ROTULOS_PRIORIDADE_TAREFA,
} from '../domain/taskOrdering';
import { EstadoTarefa, PrioridadeTarefa, Tarefa } from '../domain/types';
import {
  ESTADOS_TAREFA_VALIDOS,
  ErrosTarefa,
  PRIORIDADES_TAREFA_VALIDAS,
  validarDadosTarefa,
} from '../domain/validation';

export interface TaskFormModalProps {
  aberto: boolean;
  tarefaEmEdicao: Tarefa | null;
  aoSalvar: (dados: {
    titulo: string;
    estado: EstadoTarefa;
    prioridade: PrioridadeTarefa;
  }) => void;
  aoCancelar: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  aberto,
  tarefaEmEdicao,
  aoSalvar,
  aoCancelar,
}) => {
  // RN-12: Toda tarefa criada assume estado backlog e prioridade média como valores padrão
  const [titulo, setTitulo] = useState('');
  const [estado, setEstado] = useState<EstadoTarefa>('backlog');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [erros, setErros] = useState<ErrosTarefa>({});

  const campoTituloRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;

    if (tarefaEmEdicao) {
      setTitulo(tarefaEmEdicao.titulo);
      setEstado(tarefaEmEdicao.estado);
      setPrioridade(tarefaEmEdicao.prioridade);
    } else {
      setTitulo('');
      setEstado('backlog');
      setPrioridade('media');
    }
    setErros({});

    const timer = window.setTimeout(() => campoTituloRef.current?.focus(), 20);
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        aoCancelar();
      }
    };
    window.addEventListener('keydown', aoTeclar);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, tarefaEmEdicao, aoCancelar]);

  if (!aberto) return null;

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const resultado = validarDadosTarefa({
      titulo,
      estado,
      prioridade,
    });

    if (!resultado.valido || !resultado.dados) {
      setErros(resultado.erros);
      return;
    }

    aoSalvar(resultado.dados);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoCancelar();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-tarefa-titulo"
      >
        <div className="modal-cabecalho">
          <h2 id="modal-tarefa-titulo" className="modal-titulo">
            {tarefaEmEdicao ? 'Editar Tarefa' : 'Nova Tarefa de Estudo'}
          </h2>
          <button
            type="button"
            className="btn-icone"
            aria-label="Fechar formulário de tarefa"
            onClick={aoCancelar}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submeter} noValidate className="formulario">
          <div className="campo-grupo">
            <label htmlFor="tarefa-titulo" className="campo-rotulo">
              Título da tarefa <span className="obrigatorio">*</span>
            </label>
            <input
              ref={campoTituloRef}
              id="tarefa-titulo"
              type="text"
              className={`campo-input ${erros.titulo ? 'campo-input--erro' : ''}`}
              placeholder="Ex.: Resolver lista 3 de Estrutura de Dados"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                if (erros.titulo)
                  setErros((prev) => ({ ...prev, titulo: undefined }));
              }}
              aria-invalid={Boolean(erros.titulo)}
              aria-describedby={
                erros.titulo ? 'erro-tarefa-titulo' : 'dica-tarefa-titulo'
              }
            />
            <span id="dica-tarefa-titulo" className="campo-dica">
              Entre 1 e 100 caracteres ({titulo.trim().length}/100)
            </span>
            {erros.titulo && (
              <p id="erro-tarefa-titulo" className="campo-erro" role="alert">
                {erros.titulo}
              </p>
            )}
          </div>

          <div className="grade-campos-2">
            <div className="campo-grupo">
              <label htmlFor="tarefa-prioridade" className="campo-rotulo">
                Prioridade
              </label>
              <select
                id="tarefa-prioridade"
                className="campo-select"
                value={prioridade}
                onChange={(e) =>
                  setPrioridade(e.target.value as PrioridadeTarefa)
                }
              >
                {PRIORIDADES_TAREFA_VALIDAS.map((p) => (
                  <option key={p} value={p}>
                    {ROTULOS_PRIORIDADE_TAREFA[p]}
                  </option>
                ))}
              </select>
              {erros.prioridade && (
                <p className="campo-erro" role="alert">
                  {erros.prioridade}
                </p>
              )}
            </div>

            <div className="campo-grupo">
              <label htmlFor="tarefa-estado" className="campo-rotulo">
                Estado
              </label>
              <select
                id="tarefa-estado"
                className="campo-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoTarefa)}
              >
                {ESTADOS_TAREFA_VALIDOS.map((est) => (
                  <option key={est} value={est}>
                    {ROTULOS_ESTADO_TAREFA[est]}
                  </option>
                ))}
              </select>
              <span className="campo-dica">
                {DESCRICOES_ESTADO_TAREFA[estado]}
              </span>
              {erros.estado && (
                <p className="campo-erro" role="alert">
                  {erros.estado}
                </p>
              )}
            </div>
          </div>

          <div className="modal-acoes">
            <button
              type="button"
              className="btn btn-secundario"
              onClick={aoCancelar}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario">
              {tarefaEmEdicao ? 'Salvar Alterações' : 'Adicionar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
