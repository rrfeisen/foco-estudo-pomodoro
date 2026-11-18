import React, { useState } from 'react';
import {
  Check,
  Clock,
  Lock,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { presetEstaEmSessaoAtiva } from '../domain/sessionEngine';
import { SessaoAtiva, TemporizadorPersonalizado } from '../domain/types';

export interface PresetListProps {
  presets: TemporizadorPersonalizado[];
  presetSelecionadoId: string | null;
  sessaoAtiva: SessaoAtiva | null;
  aoCriarNovo: () => void;
  aoSelecionarPreset: (preset: TemporizadorPersonalizado) => void;
  aoEditarPreset: (preset: TemporizadorPersonalizado) => void;
  aoSolicitarExcluirPreset: (preset: TemporizadorPersonalizado) => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  presetSelecionadoId,
  sessaoAtiva,
  aoCriarNovo,
  aoSelecionarPreset,
  aoEditarPreset,
  aoSolicitarExcluirPreset,
}) => {
  const [avisoBloqueioId, setAvisoBloqueioId] = useState<string | null>(null);

  const existeSessaoEmCurso =
    sessaoAtiva !== null && sessaoAtiva.status !== 'concluida';

  const tratarAcaoBloqueada = (presetId: string) => {
    setAvisoBloqueioId(presetId);
  };

  return (
    <section
      className="secao-presets"
      aria-labelledby="titulo-presets-personalizados"
    >
      <div className="secao-cabecalho">
        <div>
          <h2 id="titulo-presets-personalizados" className="secao-titulo">
            Temporizadores Personalizados
          </h2>
          <p className="secao-subtitulo">
            Configure seus ciclos de estudo ou alterne entre temporizadores
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primario btn-compacto"
          onClick={aoCriarNovo}
        >
          <Plus size={17} aria-hidden="true" />
          Novo Temporizador
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="estado-vazio">
          <Clock size={32} aria-hidden="true" className="estado-vazio-icone" />
          <p className="estado-vazio-titulo">
            Nenhum temporizador personalizado cadastrado
          </p>
          <p className="estado-vazio-texto">
            Crie seu primeiro temporizador definindo os tempos de foco, pausa curta
            e pausa longa.
          </p>
          <button
            type="button"
            className="btn btn-primario"
            onClick={aoCriarNovo}
          >
            <Plus size={17} aria-hidden="true" />
            Criar Temporizador
          </button>
        </div>
      ) : (
        <ul className="lista-presets">
          {presets.map((preset) => {
            const bloqueadoPorSessao = presetEstaEmSessaoAtiva(
              preset.id,
              sessaoAtiva
            );
            const selecionado = bloqueadoPorSessao
              ? true
              : !existeSessaoEmCurso && presetSelecionadoId === preset.id;

            return (
              <li
                key={preset.id}
                className={`card-preset ${
                  selecionado ? 'card-preset--selecionado' : ''
                } ${bloqueadoPorSessao ? 'card-preset--em-uso' : ''}`}
              >
                <div className="card-preset-topo">
                  <div className="card-preset-titulos">
                    <h3 className="card-preset-nome">{preset.nome}</h3>
                    {bloqueadoPorSessao && (
                      <span className="badge badge-ativo">
                        <Lock size={12} aria-hidden="true" />
                        Sessão ativa
                      </span>
                    )}
                  </div>

                  <div className="card-preset-acoes">
                    <button
                      type="button"
                      className={`btn-icone ${
                        bloqueadoPorSessao ? 'btn-icone--bloqueado' : ''
                      }`}
                      aria-label={`Editar temporizador ${preset.nome}`}
                      aria-disabled={bloqueadoPorSessao}
                      title={
                        bloqueadoPorSessao
                          ? 'Edição bloqueada durante sessão ativa neste temporizador'
                          : 'Editar temporizador'
                      }
                      onClick={() => {
                        if (bloqueadoPorSessao) {
                          tratarAcaoBloqueada(preset.id);
                          return;
                        }
                        setAvisoBloqueioId(null);
                        aoEditarPreset(preset);
                      }}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      className={`btn-icone btn-icone--perigo ${
                        bloqueadoPorSessao ? 'btn-icone--bloqueado' : ''
                      }`}
                      aria-label={`Excluir temporizador ${preset.nome}`}
                      aria-disabled={bloqueadoPorSessao}
                      title={
                        bloqueadoPorSessao
                          ? 'Exclusão bloqueada durante sessão ativa neste temporizador'
                          : 'Excluir temporizador'
                      }
                      onClick={() => {
                        if (bloqueadoPorSessao) {
                          tratarAcaoBloqueada(preset.id);
                          return;
                        }
                        setAvisoBloqueioId(null);
                        aoSolicitarExcluirPreset(preset);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <dl className="preset-parametros">
                  <div className="parametro-item">
                    <dt>Foco</dt>
                    <dd>{preset.tempoFocoMin} min</dd>
                  </div>
                  <div className="parametro-item">
                    <dt>Pausa curta</dt>
                    <dd>{preset.tempoPausaCurtaMin} min</dd>
                  </div>
                  <div className="parametro-item">
                    <dt>Ciclos</dt>
                    <dd>{preset.ciclosAntesPausaLonga}x</dd>
                  </div>
                  <div className="parametro-item">
                    <dt>Pausa longa</dt>
                    <dd>{preset.tempoPausaLongaMin} min</dd>
                  </div>
                </dl>

                {bloqueadoPorSessao && avisoBloqueioId === preset.id && (
                  <p className="aviso-rn01" role="alert">
                    Este temporizador está em uso pela sessão ativa e não pode ser
                    editado nem excluído até que a sessão seja encerrada.
                  </p>
                )}

                <div className="card-preset-rodape">
                  {bloqueadoPorSessao ? (
                    <span className="status-em-execucao">
                      <Check size={15} aria-hidden="true" />
                      Em execução no momento
                    </span>
                  ) : existeSessaoEmCurso ? (
                    <button
                      type="button"
                      className="btn btn-secundario btn-bloco"
                      onClick={() => {
                        setAvisoBloqueioId(null);
                        aoSelecionarPreset(preset);
                      }}
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      Selecionar e iniciar (encerra atual)
                    </button>
                  ) : selecionado ? (
                    <span className="status-selecionado">
                      <Check size={15} aria-hidden="true" />
                      Selecionado para iniciar
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secundario btn-bloco"
                      onClick={() => {
                        setAvisoBloqueioId(null);
                        aoSelecionarPreset(preset);
                      }}
                    >
                      <Play size={15} aria-hidden="true" />
                      Selecionar temporizador
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
