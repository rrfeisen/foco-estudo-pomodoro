import React from 'react';
import {
  CheckCircle2,
  History,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  formatarTempoMmSs,
  obterDuracaoFaseMs,
  obterTempoRestanteMs,
  rotuloFase,
} from '../domain/sessionEngine';
import {
  FaseSessao,
  SessaoAtiva,
  TemporizadorPersonalizado,
} from '../domain/types';
import { TipoSomAmbiente } from '../services/audioService';

export interface InfoSessaoRetomada {
  fasesAvancadas: number;
  concluiuFechado: boolean;
  estavaPausada: boolean;
}

export interface TimerPanelProps {
  sessaoAtiva: SessaoAtiva | null;
  presetSelecionado: TemporizadorPersonalizado | null;
  agoraMs: number;
  infoRetomada: InfoSessaoRetomada | null;
  somAmbiente: TipoSomAmbiente;
  volumeAmbiente: number;
  aoIniciar: () => void;
  aoPausar: () => void;
  aoRetomar: () => void;
  aoPularFase: () => void;
  aoSolicitarReiniciarCiclos: () => void;
  aoSolicitarEncerrarSessao: () => void;
  aoSolicitarDescartarRetomada: () => void;
  aoFecharResumoConcluido: () => void;
  aoAlterarSomAmbiente: (tipo: TipoSomAmbiente) => void;
  aoAlterarVolumeAmbiente: (volume: number) => void;
}

const OPCOES_SOM_AMBIENTE: { valor: TipoSomAmbiente; rotulo: string }[] = [
  { valor: 'desativado', rotulo: 'Desativado' },
  { valor: 'chuva', rotulo: 'Chuva Suave' },
  { valor: 'ruidoMarrom', rotulo: 'Ruído Marrom' },
  { valor: 'ondas', rotulo: 'Ondas Calmas' },
];

export const TimerPanel: React.FC<TimerPanelProps> = ({
  sessaoAtiva,
  presetSelecionado,
  agoraMs,
  infoRetomada,
  somAmbiente,
  volumeAmbiente,
  aoIniciar,
  aoPausar,
  aoRetomar,
  aoPularFase,
  aoSolicitarReiniciarCiclos,
  aoSolicitarEncerrarSessao,
  aoSolicitarDescartarRetomada,
  aoFecharResumoConcluido,
  aoAlterarSomAmbiente,
  aoAlterarVolumeAmbiente,
}) => {
  const faseVisual: FaseSessao = sessaoAtiva ? sessaoAtiva.faseAtual : 'foco';

  const duracaoTotalMs = sessaoAtiva
    ? obterDuracaoFaseMs(sessaoAtiva.snapshotPreset, sessaoAtiva.faseAtual)
    : presetSelecionado
    ? presetSelecionado.tempoFocoMin * 60_000
    : 25 * 60_000;

  const tempoRestanteMs = sessaoAtiva
    ? obterTempoRestanteMs(sessaoAtiva, agoraMs)
    : duracaoTotalMs;

  const fracaoRestante =
    duracaoTotalMs > 0
      ? Math.min(1, Math.max(0, tempoRestanteMs / duracaoTotalMs))
      : 0;

  const totalCiclos = sessaoAtiva
    ? sessaoAtiva.snapshotPreset.ciclosAntesPausaLonga
    : presetSelecionado?.ciclosAntesPausaLonga ?? 4;

  const cicloCorrente = sessaoAtiva ? sessaoAtiva.cicloAtual : 1;
  const ciclosConcluidos = sessaoAtiva ? sessaoAtiva.ciclosConcluidos ?? 0 : 0;

  const raioSvg = 116;
  const circunferencia = 2 * Math.PI * raioSvg;
  const deslocamentoTraco = circunferencia * (1 - fracaoRestante);

  const classeFase =
    sessaoAtiva?.status === 'concluida'
      ? 'tema-concluida'
      : `tema-${faseVisual}`;

  const renderizarTextoRetomada = (info: InfoSessaoRetomada): string => {
    if (info.concluiuFechado) {
      return 'Sessão retomada automaticamente: todas as fases previstas venceram enquanto o navegador esteve fechado.';
    }
    if (info.estavaPausada) {
      return 'Sessão retomada automaticamente: o temporizador permaneceu pausado com o tempo restante preservado.';
    }
    if (info.fasesAvancadas > 0) {
      return `Sessão retomada automaticamente: ${info.fasesAvancadas} ${
        info.fasesAvancadas === 1 ? 'fase avançou' : 'fases avançaram'
      } com base nos horários registrados.`;
    }
    return 'Sessão em andamento restaurada automaticamente a partir do último horário salvo.';
  };

  return (
    <section
      className={`painel-timer ${classeFase}`}
      aria-label="Temporizador de foco Pomodoro"
    >
      {infoRetomada && sessaoAtiva && (
        <div className="banner-retomada" role="status" aria-live="polite">
          <div className="banner-retomada-conteudo">
            <History size={18} aria-hidden="true" className="icone-fixo" />
            <span>{renderizarTextoRetomada(infoRetomada)}</span>
          </div>
          <button
            type="button"
            className="btn btn-descartar-retomada"
            onClick={aoSolicitarDescartarRetomada}
          >
            <Trash2 size={15} aria-hidden="true" />
            Descartar sessão retomada
          </button>
        </div>
      )}

      <div className="timer-topo">
        <div className="fases-indicadores" role="group" aria-label="Etapas do ciclo">
          {(['foco', 'pausaCurta', 'pausaLonga'] as FaseSessao[]).map((fase) => {
            const ativa =
              sessaoAtiva?.status !== 'concluida' && faseVisual === fase;
            return (
              <span
                key={fase}
                className={`pilula-fase ${ativa ? 'pilula-fase--ativa' : ''}`}
                aria-current={ativa ? 'step' : undefined}
              >
                {rotuloFase(fase)}
              </span>
            );
          })}
        </div>

        <div className="preset-ativo-resumo">
          {sessaoAtiva ? (
            <>
              <span className="preset-ativo-nome">
                {sessaoAtiva.snapshotPreset.nome}
              </span>
              <span className="preset-ativo-detalhe">
                Foco {sessaoAtiva.snapshotPreset.tempoFocoMin}m · Curta{' '}
                {sessaoAtiva.snapshotPreset.tempoPausaCurtaMin}m · Longa{' '}
                {sessaoAtiva.snapshotPreset.tempoPausaLongaMin}m
              </span>
            </>
          ) : presetSelecionado ? (
            <>
              <span className="preset-ativo-nome">{presetSelecionado.nome}</span>
              <span className="preset-ativo-detalhe">
                Pronto para iniciar · {presetSelecionado.ciclosAntesPausaLonga}{' '}
                {presetSelecionado.ciclosAntesPausaLonga === 1 ? 'ciclo' : 'ciclos'}
              </span>
            </>
          ) : (
            <span className="preset-ativo-detalhe">
              Cadastre ou selecione um temporizador abaixo para começar
            </span>
          )}
        </div>
      </div>

      {sessaoAtiva?.status === 'concluida' ? (
        <div className="bloco-concluido" role="status" aria-live="polite">
          <div className="icone-concluido" aria-hidden="true">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="concluido-titulo">Sessão Concluída!</h2>
          <p className="concluido-texto">
            Você completou todos os{' '}
            <strong>{sessaoAtiva.snapshotPreset.ciclosAntesPausaLonga}</strong>{' '}
            ciclos do temporizador <strong>{sessaoAtiva.snapshotPreset.nome}</strong>.
          </p>
          <div className="controles-principais">
            {presetSelecionado && (
              <button
                type="button"
                className="btn btn-primario btn-grande"
                onClick={aoIniciar}
              >
                <Play size={20} aria-hidden="true" />
                Iniciar Nova Sessão
              </button>
            )}
            <button
              type="button"
              className="btn btn-secundario"
              onClick={aoFecharResumoConcluido}
            >
              Fechar Sessão
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relogio-container">
            <svg
              className="relogio-anel"
              viewBox="0 0 264 264"
              aria-hidden="true"
            >
              <circle
                className="relogio-trilha"
                cx="132"
                cy="132"
                r={raioSvg}
                fill="none"
                strokeWidth="10"
              />
              <circle
                className="relogio-progresso"
                cx="132"
                cy="132"
                r={raioSvg}
                fill="none"
                strokeWidth="10"
                strokeDasharray={circunferencia}
                strokeDashoffset={deslocamentoTraco}
                strokeLinecap="round"
                transform="rotate(-90 132 132)"
              />
            </svg>

            <div className="relogio-centro">
              <span className="relogio-status-rotulo">
                {!sessaoAtiva
                  ? 'Aguardando início'
                  : sessaoAtiva.status === 'pausada'
                  ? 'Sessão Pausada'
                  : `Em ${rotuloFase(sessaoAtiva.faseAtual)}`}
              </span>
              <div
                className="relogio-digitos"
                role="timer"
                aria-live="off"
                aria-label={`Tempo restante: ${formatarTempoMmSs(tempoRestanteMs)}`}
              >
                {formatarTempoMmSs(tempoRestanteMs)}
              </div>
              <div
                className="ciclos-progresso"
                aria-label={`Ciclo ${cicloCorrente} de ${totalCiclos}, ${ciclosConcluidos} concluídos`}
              >
                <span className="ciclos-texto">
                  Ciclo {cicloCorrente} de {totalCiclos}
                </span>
                <div className="ciclos-pontos" aria-hidden="true">
                  {Array.from({ length: totalCiclos }, (_, idx) => {
                    const num = idx + 1;
                    const estadoPonto =
                      sessaoAtiva && num < cicloCorrente
                        ? 'concluido'
                        : sessaoAtiva && num === cicloCorrente
                        ? 'atual'
                        : 'pendente';
                    return (
                      <span
                        key={num}
                        className={`ciclo-ponto ciclo-ponto--${estadoPonto}`}
                      />
                    );
                  })}
                </div>
                {sessaoAtiva && (
                  <span className="ciclos-concluidos-subtexto">
                    {ciclosConcluidos}{' '}
                    {ciclosConcluidos === 1 ? 'concluído' : 'concluídos'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!sessaoAtiva ? (
            <div className="controles-principais">
              <button
                type="button"
                className="btn btn-primario btn-grande"
                onClick={aoIniciar}
                disabled={!presetSelecionado}
              >
                <Play size={20} aria-hidden="true" />
                Iniciar Sessão de Foco
              </button>
            </div>
          ) : (
            <div className="controles-sessao">
              <div className="controles-principais">
                {sessaoAtiva.status === 'emAndamento' ? (
                  <button
                    type="button"
                    className="btn btn-primario btn-grande"
                    onClick={aoPausar}
                  >
                    <Pause size={20} aria-hidden="true" />
                    Pausar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primario btn-grande"
                    onClick={aoRetomar}
                  >
                    <Play size={20} aria-hidden="true" />
                    Retomar
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={aoPularFase}
                  title="Avançar manualmente para a próxima fase sem incrementar ciclos"
                >
                  <SkipForward size={18} aria-hidden="true" />
                  Pular Fase
                </button>
              </div>

              <div className="controles-secundarios">
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={aoSolicitarReiniciarCiclos}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Reiniciar Ciclos
                </button>
                <button
                  type="button"
                  className="btn btn-fantasma btn-fantasma--perigo"
                  onClick={aoSolicitarEncerrarSessao}
                >
                  <Square size={16} aria-hidden="true" />
                  Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="barra-som-ambiente" aria-label="Controles de som ambiente opcional">
        <div className="som-ambiente-rotulo">
          {somAmbiente === 'desativado' ? (
            <VolumeX size={17} aria-hidden="true" />
          ) : (
            <Volume2 size={17} aria-hidden="true" />
          )}
          <label htmlFor="seletor-som-ambiente">Som ambiente:</label>
        </div>

        <div className="som-ambiente-controles">
          <select
            id="seletor-som-ambiente"
            className="campo-select campo-select--compacto"
            value={somAmbiente}
            onChange={(e) =>
              aoAlterarSomAmbiente(e.target.value as TipoSomAmbiente)
            }
          >
            {OPCOES_SOM_AMBIENTE.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.rotulo}
              </option>
            ))}
          </select>

          {somAmbiente !== 'desativado' && (
            <div className="volume-container">
              <label htmlFor="volume-som-ambiente" className="sr-only">
                Volume do som ambiente
              </label>
              <input
                id="volume-som-ambiente"
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={volumeAmbiente}
                onChange={(e) =>
                  aoAlterarVolumeAmbiente(Number(e.target.value))
                }
                className="slider-volume"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
