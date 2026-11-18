import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Flame, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PresetFormModal } from './components/PresetFormModal';
import { PresetList } from './components/PresetList';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskSidebar } from './components/TaskSidebar';
import { InfoSessaoRetomada, TimerPanel } from './components/TimerPanel';
import {
  criarSessaoAtiva,
  formatarTempoMmSs,
  gerarId,
  obterTempoRestanteMs,
  pausarSessao,
  presetEstaEmSessaoAtiva,
  pularFase,
  recalcularSessaoPorTimestamp,
  reiniciarCiclos,
  retomarSessao,
  rotuloFase,
} from './domain/sessionEngine';
import {
  EstadoTarefa,
  PrioridadeTarefa,
  SessaoAtiva,
  Tarefa,
  TemporizadorPersonalizado,
} from './domain/types';
import {
  carregarPresets,
  carregarSessaoAtiva,
  carregarTarefas,
  removerSessaoAtiva,
  salvarPresets,
  salvarSessaoAtiva,
  salvarTarefas,
} from './persistence/localStorageRepository';
import { servicoAudio, TipoSomAmbiente } from './services/audioService';

type EstadoConfirmacao =
  | { tipo: 'excluirPreset'; preset: TemporizadorPersonalizado }
  | { tipo: 'excluirTarefa'; tarefa: Tarefa }
  | { tipo: 'reiniciarCiclos' }
  | { tipo: 'encerrarSessao' }
  | { tipo: 'descartarRetomada' }
  | null;

interface EstadoInicialCarregado {
  presets: TemporizadorPersonalizado[];
  tarefas: Tarefa[];
  sessaoAtiva: SessaoAtiva | null;
  presetSelecionadoId: string | null;
  infoRetomada: InfoSessaoRetomada | null;
  erroSessaoCorrompida: string | null;
  mensagemAlerta: string | null;
}

function inicializarEstadoAplicacao(): EstadoInicialCarregado {
  const agora = Date.now();
  const leituraPresets = carregarPresets();
  const leituraTarefas = carregarTarefas();
  const leituraSessao = carregarSessaoAtiva();

  let sessaoRestaurada: SessaoAtiva | null = null;
  let infoRetomada: InfoSessaoRetomada | null = null;
  let erroPersist: string | null =
    leituraPresets.avisoInconsistencia ??
    leituraTarefas.avisoInconsistencia ??
    null;

  if (leituraSessao.sessao) {
    const estavaPausada = leituraSessao.sessao.status === 'pausada';
    const resultado = recalcularSessaoPorTimestamp(leituraSessao.sessao, agora);
    sessaoRestaurada = resultado.sessao;

    const erroSalvar = salvarSessaoAtiva(sessaoRestaurada);
    if (erroSalvar) erroPersist = erroSalvar;

    infoRetomada = {
      fasesAvancadas: resultado.fasesAvancadas,
      concluiuFechado: resultado.concluiuAgora,
      estavaPausada,
    };
  }

  const presetDaSessaoExiste =
    sessaoRestaurada &&
    leituraPresets.itens.some((p) => p.id === sessaoRestaurada!.presetId);

  const presetSelecionadoId = presetDaSessaoExiste
    ? sessaoRestaurada!.presetId
    : leituraPresets.itens[0]?.id ?? null;

  return {
    presets: leituraPresets.itens,
    tarefas: leituraTarefas.itens,
    sessaoAtiva: sessaoRestaurada,
    presetSelecionadoId,
    infoRetomada,
    erroSessaoCorrompida: leituraSessao.inconsistente
      ? leituraSessao.mensagemErro ??
        'A sessão salva apresentava dados inconsistentes.'
      : null,
    mensagemAlerta: erroPersist,
  };
}

export const App: React.FC = () => {
  const estadoInicial = useMemo(() => inicializarEstadoAplicacao(), []);

  const [presets, setPresets] = useState<TemporizadorPersonalizado[]>(
    estadoInicial.presets
  );
  const [tarefas, setTarefas] = useState<Tarefa[]>(estadoInicial.tarefas);
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAtiva | null>(
    estadoInicial.sessaoAtiva
  );
  const [presetSelecionadoId, setPresetSelecionadoId] = useState<string | null>(
    estadoInicial.presetSelecionadoId
  );
  const [infoRetomada, setInfoRetomada] = useState<InfoSessaoRetomada | null>(
    estadoInicial.infoRetomada
  );
  const [erroSessaoCorrompida, setErroSessaoCorrompida] = useState<
    string | null
  >(estadoInicial.erroSessaoCorrompida);
  const [mensagemAlerta, setMensagemAlerta] = useState<string | null>(
    estadoInicial.mensagemAlerta
  );

  const [agoraMs, setAgoraMs] = useState<number>(() => Date.now());

  // Modais de formulário e confirmação
  const [modalPresetAberto, setModalPresetAberto] = useState(false);
  const [presetEmEdicao, setPresetEmEdicao] =
    useState<TemporizadorPersonalizado | null>(null);

  const [modalTarefaAberto, setModalTarefaAberto] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<Tarefa | null>(null);

  const [confirmacao, setConfirmacao] = useState<EstadoConfirmacao>(null);

  // Som ambiente opcional
  const [somAmbiente, setSomAmbiente] = useState<TipoSomAmbiente>('desativado');
  const [volumeAmbiente, setVolumeAmbiente] = useState<number>(0.35);

  const presetSelecionado = useMemo(
    () => presets.find((p) => p.id === presetSelecionadoId) ?? presets[0] ?? null,
    [presets, presetSelecionadoId]
  );

  const sincronizarRelogioESessao = useCallback(() => {
    const instante = Date.now();
    setAgoraMs(instante);

    setSessaoAtiva((atual) => {
      if (!atual || atual.status !== 'emAndamento') {
        return atual;
      }

      if (instante < atual.fimFasePrevistoEm) {
        return atual;
      }

      const resultado = recalcularSessaoPorTimestamp(atual, instante);
      if (resultado.fasesAvancadas > 0 || resultado.concluiuAgora) {
        // RN-13 / RF-14: Emite alerta sonoro ao fim de cada fase e atualiza estado
        servicoAudio.emitirAlertaFimDeFase();
        const erro = salvarSessaoAtiva(resultado.sessao);
        if (erro) setMensagemAlerta(erro);
      }

      return resultado.sessao;
    });
  }, []);

  // Atualização contínua baseada em timestamps absolutos (RNF-03 / R-02)
  useEffect(() => {
    if (!sessaoAtiva || sessaoAtiva.status !== 'emAndamento') {
      return;
    }

    const intervalo = window.setInterval(sincronizarRelogioESessao, 250);
    const aoVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        sincronizarRelogioESessao();
      }
    };

    window.addEventListener('focus', sincronizarRelogioESessao);
    document.addEventListener('visibilitychange', aoVisibilidade);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', sincronizarRelogioESessao);
      document.removeEventListener('visibilitychange', aoVisibilidade);
    };
  }, [sessaoAtiva, sincronizarRelogioESessao]);

  // Atualiza título da aba para acompanhamento rápido durante os estudos
  useEffect(() => {
    if (!sessaoAtiva) {
      document.title = 'FocoEstudo — Gestão de Foco Pomodoro';
      return;
    }
    if (sessaoAtiva.status === 'concluida') {
      document.title = 'Sessão Concluída! — FocoEstudo';
      return;
    }
    const restante = obterTempoRestanteMs(sessaoAtiva, agoraMs);
    const prefixoPausa = sessaoAtiva.status === 'pausada' ? '⏸ ' : '';
    document.title = `${prefixoPausa}${formatarTempoMmSs(
      restante
    )} · ${rotuloFase(sessaoAtiva.faseAtual)} — FocoEstudo`;
  }, [sessaoAtiva, agoraMs]);

  // Limpa som ambiente ao desmontar
  useEffect(() => {
    return () => {
      servicoAudio.pararSomAmbiente();
    };
  }, []);

  // --- Ações de Temporizadores Personalizados (UC01, UC02, UC03, UC09) ---
  const abrirCriacaoPreset = () => {
    setPresetEmEdicao(null);
    setModalPresetAberto(true);
  };

  const abrirEdicaoPreset = (preset: TemporizadorPersonalizado) => {
    if (presetEstaEmSessaoAtiva(preset.id, sessaoAtiva)) {
      setMensagemAlerta(
        'Não é possível editar um temporizador em uso por uma sessão ativa.'
      );
      return;
    }
    setPresetEmEdicao(preset);
    setModalPresetAberto(true);
  };

  const salvarFormularioPreset = (dados: {
    nome: string;
    tempoFocoMin: number;
    tempoPausaCurtaMin: number;
    ciclosAntesPausaLonga: number;
    tempoPausaLongaMin: number;
  }) => {
    const instante = Date.now();

    if (presetEmEdicao) {
      if (presetEstaEmSessaoAtiva(presetEmEdicao.id, sessaoAtiva)) {
        setMensagemAlerta(
          'Edição bloqueada: este temporizador está em uma sessão ativa.'
        );
        setModalPresetAberto(false);
        return;
      }

      const atualizados = presets.map((p) =>
        p.id === presetEmEdicao.id
          ? { ...p, ...dados, atualizadoEm: instante }
          : p
      );
      setPresets(atualizados);
      const erro = salvarPresets(atualizados);
      if (erro) setMensagemAlerta(erro);
    } else {
      const novo: TemporizadorPersonalizado = {
        id: gerarId(),
        ...dados,
        criadoEm: instante,
        atualizadoEm: instante,
      };
      const atualizados = [...presets, novo];
      setPresets(atualizados);
      if (!presetSelecionadoId) {
        setPresetSelecionadoId(novo.id);
      }
      const erro = salvarPresets(atualizados);
      if (erro) setMensagemAlerta(erro);
    }

    setModalPresetAberto(false);
    setPresetEmEdicao(null);
  };

  // UC09 / RN-02: Selecionar outro preset encerra automaticamente a sessão ativa e inicia nova sessão
  const selecionarPreset = (preset: TemporizadorPersonalizado) => {
    setPresetSelecionadoId(preset.id);

    if (sessaoAtiva && sessaoAtiva.status !== 'concluida') {
      if (sessaoAtiva.presetId === preset.id) return;

      const instante = Date.now();
      const novaSessao = criarSessaoAtiva(preset, instante);
      servicoAudio.emitirToqueInicioSessao();
      setAgoraMs(instante);
      setSessaoAtiva(novaSessao);
      setInfoRetomada(null);
      const erro = salvarSessaoAtiva(novaSessao);
      if (erro) setMensagemAlerta(erro);
      return;
    }

    if (sessaoAtiva?.status === 'concluida') {
      const erro = removerSessaoAtiva();
      if (erro) setMensagemAlerta(erro);
      setSessaoAtiva(null);
      setInfoRetomada(null);
    }
  };

  // --- Ações da Sessão de Foco (UC04 a UC11) ---
  const iniciarSessao = () => {
    if (!presetSelecionado) return;
    const instante = Date.now();
    const novaSessao = criarSessaoAtiva(presetSelecionado, instante);

    // R-01: Primeiro som após interação no botão iniciar mantém AudioContext ativo
    servicoAudio.emitirToqueInicioSessao();

    setPresetSelecionadoId(presetSelecionado.id);
    setAgoraMs(instante);
    setSessaoAtiva(novaSessao);
    setInfoRetomada(null);
    const erro = salvarSessaoAtiva(novaSessao);
    if (erro) setMensagemAlerta(erro);
  };

  const acionarPausar = () => {
    if (!sessaoAtiva) return;
    const instante = Date.now();
    const pausada = pausarSessao(sessaoAtiva, instante);
    setAgoraMs(instante);
    setSessaoAtiva(pausada);
    const erro = salvarSessaoAtiva(pausada);
    if (erro) setMensagemAlerta(erro);
  };

  const acionarRetomar = () => {
    if (!sessaoAtiva) return;
    const instante = Date.now();
    const retomada = retomarSessao(sessaoAtiva, instante);
    servicoAudio.emitirToqueInicioSessao();
    setAgoraMs(instante);
    setSessaoAtiva(retomada);
    const erro = salvarSessaoAtiva(retomada);
    if (erro) setMensagemAlerta(erro);
  };

  const acionarPularFase = () => {
    if (!sessaoAtiva) return;
    const instante = Date.now();
    const resultado = pularFase(sessaoAtiva, instante);
    servicoAudio.emitirAlertaFimDeFase();
    setAgoraMs(instante);
    setInfoRetomada(null);

    if (resultado.encerradaPorUltimaFase || !resultado.sessao) {
      setSessaoAtiva(null);
      const erro = removerSessaoAtiva();
      if (erro) setMensagemAlerta(erro);
      return;
    }

    setSessaoAtiva(resultado.sessao);
    const erro = salvarSessaoAtiva(resultado.sessao);
    if (erro) setMensagemAlerta(erro);
  };

  const fecharResumoConcluido = () => {
    setSessaoAtiva(null);
    setInfoRetomada(null);
    const erro = removerSessaoAtiva();
    if (erro) setMensagemAlerta(erro);
  };

  const descartarSessaoCorrompida = () => {
    const erro = removerSessaoAtiva();
    if (erro) setMensagemAlerta(erro);
    setErroSessaoCorrompida(null);
  };

  // --- Ações de Tarefas (UC12, UC13, UC14 — desacopladas conforme RN-09) ---
  const abrirCriacaoTarefa = () => {
    setTarefaEmEdicao(null);
    setModalTarefaAberto(true);
  };

  const abrirEdicaoTarefa = (tarefa: Tarefa) => {
    setTarefaEmEdicao(tarefa);
    setModalTarefaAberto(true);
  };

  const salvarFormularioTarefa = (dados: {
    titulo: string;
    estado: EstadoTarefa;
    prioridade: PrioridadeTarefa;
  }) => {
    const instante = Date.now();

    if (tarefaEmEdicao) {
      const atualizadas = tarefas.map((t) =>
        t.id === tarefaEmEdicao.id
          ? { ...t, ...dados, atualizadoEm: instante }
          : t
      );
      setTarefas(atualizadas);
      const erro = salvarTarefas(atualizadas);
      if (erro) setMensagemAlerta(erro);
    } else {
      const nova: Tarefa = {
        id: gerarId(),
        ...dados,
        criadaEm: instante,
        atualizadaEm: instante,
      };
      const atualizadas = [...tarefas, nova];
      setTarefas(atualizadas);
      const erro = salvarTarefas(atualizadas);
      if (erro) setMensagemAlerta(erro);
    }

    setModalTarefaAberto(false);
    setTarefaEmEdicao(null);
  };

  const alterarEstadoRapidoTarefa = (
    tarefaId: string,
    novoEstado: EstadoTarefa
  ) => {
    const instante = Date.now();
    const atualizadas = tarefas.map((t) =>
      t.id === tarefaId
        ? { ...t, estado: novoEstado, atualizadoEm: instante }
        : t
    );
    setTarefas(atualizadas);
    const erro = salvarTarefas(atualizadas);
    if (erro) setMensagemAlerta(erro);
  };

  // --- Som Ambiente ---
  const alterarSomAmbiente = (tipo: TipoSomAmbiente) => {
    setSomAmbiente(tipo);
    servicoAudio.configurarSomAmbiente(tipo, volumeAmbiente);
  };

  const alterarVolumeAmbiente = (novoVolume: number) => {
    setVolumeAmbiente(novoVolume);
    servicoAudio.ajustarVolumeAmbiente(novoVolume);
  };

  // --- Confirmações Explícitas (RF-20 / RN-11: UC03, UC07, UC08, UC11, UC14) ---
  const confirmarOperacao = () => {
    if (!confirmacao) return;

    switch (confirmacao.tipo) {
      case 'excluirPreset': {
        if (presetEstaEmSessaoAtiva(confirmacao.preset.id, sessaoAtiva)) {
          setMensagemAlerta(
            'Não é permitido excluir um temporizador em uso por sessão ativa.'
          );
          break;
        }
        const restantes = presets.filter((p) => p.id !== confirmacao.preset.id);
        setPresets(restantes);
        if (presetSelecionadoId === confirmacao.preset.id) {
          setPresetSelecionadoId(restantes[0]?.id ?? null);
        }
        const erro = salvarPresets(restantes);
        if (erro) setMensagemAlerta(erro);
        break;
      }

      case 'excluirTarefa': {
        const restantes = tarefas.filter((t) => t.id !== confirmacao.tarefa.id);
        setTarefas(restantes);
        const erro = salvarTarefas(restantes);
        if (erro) setMensagemAlerta(erro);
        break;
      }

      case 'reiniciarCiclos': {
        if (sessaoAtiva) {
          const instante = Date.now();
          const reiniciada = reiniciarCiclos(sessaoAtiva, instante);
          servicoAudio.emitirAlertaFimDeFase();
          setAgoraMs(instante);
          setSessaoAtiva(reiniciada);
          setInfoRetomada(null);
          const erro = salvarSessaoAtiva(reiniciada);
          if (erro) setMensagemAlerta(erro);
        }
        break;
      }

      case 'encerrarSessao':
      case 'descartarRetomada': {
        setSessaoAtiva(null);
        setInfoRetomada(null);
        const erro = removerSessaoAtiva();
        if (erro) setMensagemAlerta(erro);
        break;
      }
    }

    setConfirmacao(null);
  };

  const obterDadosConfirmacao = () => {
    if (!confirmacao) return null;

    switch (confirmacao.tipo) {
      case 'excluirPreset':
        return {
          titulo: 'Excluir temporizador personalizado?',
          mensagem: `Tem certeza de que deseja excluir "${confirmacao.preset.nome}"? Esta ação removerá o temporizador permanentemente.`,
          rotuloConfirmar: 'Sim, excluir temporizador',
          variante: 'perigo' as const,
        };
      case 'excluirTarefa':
        return {
          titulo: 'Excluir tarefa de estudo?',
          mensagem: `Deseja realmente excluir a tarefa "${confirmacao.tarefa.titulo}"? Esta operação não pode ser desfeita.`,
          rotuloConfirmar: 'Sim, excluir tarefa',
          variante: 'perigo' as const,
        };
      case 'reiniciarCiclos':
        return {
          titulo: 'Reiniciar contagem de ciclos?',
          mensagem:
            'A contagem de ciclos voltará ao Ciclo 1 na fase de Foco, mantendo o temporizador atual.',
          rotuloConfirmar: 'Reiniciar ciclos',
          variante: 'aviso' as const,
        };
      case 'encerrarSessao':
        return {
          titulo: 'Encerrar sessão de foco?',
          mensagem:
            'A sessão atual será encerrada e o temporizador ficará liberado para edição ou exclusão.',
          rotuloConfirmar: 'Encerrar sessão',
          variante: 'perigo' as const,
        };
      case 'descartarRetomada':
        return {
          titulo: 'Descartar sessão retomada?',
          mensagem:
            'A sessão restaurada automaticamente será descartada sem contabilizar progresso e o temporizador correspondente será liberado.',
          rotuloConfirmar: 'Descartar sessão',
          variante: 'perigo' as const,
        };
    }
  };

  const dadosModalConfirmacao = obterDadosConfirmacao();

  return (
    <div className="app-shell">
      <header className="cabecalho-app">
        <div className="cabecalho-conteudo">
          <div className="marca">
            <div className="marca-icone" aria-hidden="true">
              <Flame size={22} />
            </div>
            <div>
              <h1 className="marca-titulo">FocoEstudo</h1>
              <p className="marca-subtitulo">
                Gestão de Ciclos Pomodoro &amp; Tarefas de Estudo
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="conteudo-principal">
        {erroSessaoCorrompida && (
          <div className="alerta-sistema alerta-sistema--erro" role="alert">
            <div className="alerta-sistema-texto">
              <AlertCircle size={19} aria-hidden="true" className="icone-fixo" />
              <span>{erroSessaoCorrompida}</span>
            </div>
            <button
              type="button"
              className="btn btn-perigo btn-compacto"
              onClick={descartarSessaoCorrompida}
            >
              <Trash2 size={15} aria-hidden="true" />
              Descartar sessão inconsistente
            </button>
          </div>
        )}

        {mensagemAlerta && (
          <div className="alerta-sistema alerta-sistema--aviso" role="alert">
            <div className="alerta-sistema-texto">
              <AlertCircle size={19} aria-hidden="true" className="icone-fixo" />
              <span>{mensagemAlerta}</span>
            </div>
            <button
              type="button"
              className="btn-icone"
              aria-label="Fechar aviso"
              onClick={() => setMensagemAlerta(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="grade-layout">
          <div className="coluna-principal">
            <TimerPanel
              sessaoAtiva={sessaoAtiva}
              presetSelecionado={presetSelecionado}
              agoraMs={agoraMs}
              infoRetomada={infoRetomada}
              somAmbiente={somAmbiente}
              volumeAmbiente={volumeAmbiente}
              aoIniciar={iniciarSessao}
              aoPausar={acionarPausar}
              aoRetomar={acionarRetomar}
              aoPularFase={acionarPularFase}
              aoSolicitarReiniciarCiclos={() =>
                setConfirmacao({ tipo: 'reiniciarCiclos' })
              }
              aoSolicitarEncerrarSessao={() =>
                setConfirmacao({ tipo: 'encerrarSessao' })
              }
              aoSolicitarDescartarRetomada={() =>
                setConfirmacao({ tipo: 'descartarRetomada' })
              }
              aoFecharResumoConcluido={fecharResumoConcluido}
              aoAlterarSomAmbiente={alterarSomAmbiente}
              aoAlterarVolumeAmbiente={alterarVolumeAmbiente}
            />

            <PresetList
              presets={presets}
              presetSelecionadoId={presetSelecionado?.id ?? null}
              sessaoAtiva={sessaoAtiva}
              aoCriarNovo={abrirCriacaoPreset}
              aoSelecionarPreset={selecionarPreset}
              aoEditarPreset={abrirEdicaoPreset}
              aoSolicitarExcluirPreset={(preset) =>
                setConfirmacao({ tipo: 'excluirPreset', preset })
              }
            />
          </div>

          <TaskSidebar
            tarefas={tarefas}
            aoCriarTarefa={abrirCriacaoTarefa}
            aoEditarTarefa={abrirEdicaoTarefa}
            aoAlterarEstadoRapido={alterarEstadoRapidoTarefa}
            aoSolicitarExcluirTarefa={(tarefa) =>
              setConfirmacao({ tipo: 'excluirTarefa', tarefa })
            }
          />
        </div>
      </main>

      <PresetFormModal
        aberto={modalPresetAberto}
        presetEmEdicao={presetEmEdicao}
        aoSalvar={salvarFormularioPreset}
        aoCancelar={() => {
          setModalPresetAberto(false);
          setPresetEmEdicao(null);
        }}
      />

      <TaskFormModal
        aberto={modalTarefaAberto}
        tarefaEmEdicao={tarefaEmEdicao}
        aoSalvar={salvarFormularioTarefa}
        aoCancelar={() => {
          setModalTarefaAberto(false);
          setTarefaEmEdicao(null);
        }}
      />

      <ConfirmDialog
        aberto={Boolean(confirmacao && dadosModalConfirmacao)}
        titulo={dadosModalConfirmacao?.titulo ?? ''}
        mensagem={dadosModalConfirmacao?.mensagem ?? ''}
        rotuloConfirmar={dadosModalConfirmacao?.rotuloConfirmar}
        variante={dadosModalConfirmacao?.variante}
        aoConfirmar={confirmarOperacao}
        aoCancelar={() => setConfirmacao(null)}
      />
    </div>
  );
};

export default App;
