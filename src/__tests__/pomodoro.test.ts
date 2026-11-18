import { beforeEach, describe, expect, it } from 'vitest';
import {
  criarSessaoAtiva,
  obterTempoRestanteMs,
  pausarSessao,
  presetEstaEmSessaoAtiva,
  pularFase,
  recalcularSessaoPorTimestamp,
  reiniciarCiclos,
  retomarSessao,
} from '../domain/sessionEngine';
import { ordenarTarefas } from '../domain/taskOrdering';
import { Tarefa, TemporizadorPersonalizado } from '../domain/types';
import { validarDadosPreset, validarDadosTarefa } from '../domain/validation';
import {
  carregarPresets,
  carregarSessaoAtiva,
  carregarTarefas,
  removerSessaoAtiva,
  salvarPresets,
  salvarSessaoAtiva,
  salvarTarefas,
} from '../persistence/localStorageRepository';
import { CHAVES_STORAGE } from '../persistence/storageKeys';

const PRESET_EXEMPLO: TemporizadorPersonalizado = {
  id: 'preset-1',
  nome: 'Pomodoro Teste',
  tempoFocoMin: 25,
  tempoPausaCurtaMin: 5,
  ciclosAntesPausaLonga: 3,
  tempoPausaLongaMin: 15,
  criadoEm: 1_000_000,
  atualizadoEm: 1_000_000,
};

describe('Validações de Entrada (VR-01 a VR-08)', () => {
  it('rejeita nome vazio ou acima de 40 caracteres e limites numéricos inválidos (VR-01 a VR-05)', () => {
    const invalido = validarDadosPreset({
      nome: '',
      tempoFocoMin: 121,
      tempoPausaCurtaMin: 0,
      ciclosAntesPausaLonga: 13,
      tempoPausaLongaMin: '5.5',
    });

    expect(invalido.valido).toBe(false);
    expect(invalido.erros.nome).toBeDefined();
    expect(invalido.erros.tempoFocoMin).toBeDefined();
    expect(invalido.erros.tempoPausaCurtaMin).toBeDefined();
    expect(invalido.erros.ciclosAntesPausaLonga).toBeDefined();
    expect(invalido.erros.tempoPausaLongaMin).toBeDefined();

    const valido = validarDadosPreset({
      nome: ' Revisão Álgebra ',
      tempoFocoMin: '45',
      tempoPausaCurtaMin: '10',
      ciclosAntesPausaLonga: '4',
      tempoPausaLongaMin: '20',
    });
    expect(valido.valido).toBe(true);
    expect(valido.dados?.nome).toBe('Revisão Álgebra');
  });

  it('valida título, estado e prioridade de tarefa (VR-06 a VR-08)', () => {
    expect(
      validarDadosTarefa({
        titulo: '   ',
        estado: 'backlog',
        prioridade: 'media',
      }).valido
    ).toBe(false);

    expect(
      validarDadosTarefa({
        titulo: 'a'.repeat(101),
        estado: 'backlog',
        prioridade: 'media',
      }).valido
    ).toBe(false);

    const ok = validarDadosTarefa({
      titulo: 'Estudar grafos',
      estado: 'aFazer',
      prioridade: 'alta',
    });
    expect(ok.valido).toBe(true);
  });
});

describe('Motor de Sessão e Regras de Negócio (RN-01 a RN-08)', () => {
  it('usa snapshot imune a edições posteriores e bloqueia preset ativo (RN-01, RN-05)', () => {
    const inicio = 1_000_000;
    const sessao = criarSessaoAtiva(PRESET_EXEMPLO, inicio);

    expect(presetEstaEmSessaoAtiva(PRESET_EXEMPLO.id, sessao)).toBe(true);
    expect(presetEstaEmSessaoAtiva('outro-preset', sessao)).toBe(false);
    expect(sessao.snapshotPreset.tempoFocoMin).toBe(25);
    expect(sessao.fimFasePrevistoEm).toBe(inicio + 25 * 60_000);
  });

  it('preserva tempo restante ao pausar, não avança pausada e recalcula fim ao retomar (UC05, RN-06)', () => {
    const inicio = 1_000_000;
    const sessao = criarSessaoAtiva(PRESET_EXEMPLO, inicio);

    // Pausa após 10 minutos
    const pausada = pausarSessao(sessao, inicio + 10 * 60_000);
    expect(pausada.status).toBe('pausada');
    expect(pausada.tempoRestanteAoPausarMs).toBe(15 * 60_000);

    // RN-06: horas depois, ao reabrir navegador, permanece pausada sem avanço
    const aposReabrir = recalcularSessaoPorTimestamp(
      pausada,
      inicio + 5 * 3600_000
    );
    expect(aposReabrir.sessao.status).toBe('pausada');
    expect(obterTempoRestanteMs(aposReabrir.sessao, inicio + 5 * 3600_000)).toBe(
      15 * 60_000
    );

    // Retoma recalculando fim da fase a partir da retomada
    const instanteRetomada = inicio + 6 * 3600_000;
    const retomada = retomarSessao(aposReabrir.sessao, instanteRetomada);
    expect(retomada.status).toBe('emAndamento');
    expect(retomada.fimFasePrevistoEm).toBe(instanteRetomada + 15 * 60_000);
  });

  it('pular fase de foco ou de pausa não incrementa a contagem de ciclos (RN-03, UC06)', () => {
    const t0 = 1_000_000;
    const s0 = criarSessaoAtiva(PRESET_EXEMPLO, t0);
    expect(s0.cicloAtual).toBe(1);
    expect(s0.faseAtual).toBe('foco');

    // Pula foco -> vai para pausaCurta mantendo ciclo 1
    const pulo1 = pularFase(s0, t0 + 5_000);
    expect(pulo1.sessao?.faseAtual).toBe('pausaCurta');
    expect(pulo1.sessao?.cicloAtual).toBe(1);

    // Pula pausaCurta -> volta para foco mantendo ciclo 1 (RN-03!)
    const pulo2 = pularFase(pulo1.sessao!, t0 + 10_000);
    expect(pulo2.sessao?.faseAtual).toBe('foco');
    expect(pulo2.sessao?.cicloAtual).toBe(1);
  });

  it('reiniciar ciclos retorna ao ciclo 1 de foco mantendo preset (RN-04, UC07)', () => {
    const t0 = 1_000_000;
    const s0 = criarSessaoAtiva(PRESET_EXEMPLO, t0);
    // Avança 31 minutos: conclui Foco 1 (25m) + Pausa Curta 1 (5m) -> está no Ciclo 2 Foco
    const avancada = recalcularSessaoPorTimestamp(s0, t0 + 31 * 60_000).sessao;
    expect(avancada.cicloAtual).toBe(2);

    const reiniciada = reiniciarCiclos(avancada, t0 + 32 * 60_000);
    expect(reiniciada.cicloAtual).toBe(1);
    expect(reiniciada.faseAtual).toBe('foco');
    expect(reiniciada.status).toBe('emAndamento');
  });

  it('avança múltiplas fases por timestamp e conclui sessão quando todas vencem (RN-07, RN-08, UC10)', () => {
    const t0 = 1_000_000;
    // 3 ciclos: (25+5) + (25+5) + (25+15) = 100 minutos totais
    const s0 = criarSessaoAtiva(PRESET_EXEMPLO, t0);

    // Em t0 + 86 min: Foco1(25)+Curta1(5)+Foco2(25)+Curta2(5)+Foco3(25) = 85m -> deve estar em pausaLonga do ciclo 3 com 14m restantes!
    const em86m = recalcularSessaoPorTimestamp(s0, t0 + 86 * 60_000);
    expect(em86m.sessao.cicloAtual).toBe(3);
    expect(em86m.sessao.faseAtual).toBe('pausaLonga');
    expect(em86m.sessao.status).toBe('emAndamento');
    expect(obterTempoRestanteMs(em86m.sessao, t0 + 86 * 60_000)).toBe(
      14 * 60_000
    );

    // Em t0 + 120 min: todas as fases venceram -> concluída (RN-08) e preset liberado (RN-01)
    const em120m = recalcularSessaoPorTimestamp(s0, t0 + 120 * 60_000);
    expect(em120m.concluiuAgora).toBe(true);
    expect(em120m.sessao.status).toBe('concluida');
    expect(presetEstaEmSessaoAtiva(PRESET_EXEMPLO.id, em120m.sessao)).toBe(
      false
    );
  });
});

describe('Ordenação de Tarefas (RN-10) e Persistência (11.4 / R-03)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ordena tarefas por prioridade (alta, média, baixa) e depois estado (a fazer, em execução, concluída, cancelada, backlog)', () => {
    const tarefas: Tarefa[] = [
      {
        id: '1',
        titulo: 'Ideia futura alta',
        prioridade: 'alta',
        estado: 'backlog',
        criadaEm: 1,
        atualizadaEm: 1,
      },
      {
        id: '2',
        titulo: 'Resolver prova baixa',
        prioridade: 'baixa',
        estado: 'aFazer',
        criadaEm: 2,
        atualizadaEm: 2,
      },
      {
        id: '3',
        titulo: 'Atacar agora alta',
        prioridade: 'alta',
        estado: 'emExecucao',
        criadaEm: 3,
        atualizadaEm: 3,
      },
      {
        id: '4',
        titulo: 'Planejada alta',
        prioridade: 'alta',
        estado: 'aFazer',
        criadaEm: 4,
        atualizadaEm: 4,
      },
      {
        id: '5',
        titulo: 'Média concluída',
        prioridade: 'media',
        estado: 'concluida',
        criadaEm: 5,
        atualizadaEm: 5,
      },
    ];

    const ordenadas = ordenarTarefas(tarefas);
    expect(ordenadas.map((t) => t.id)).toEqual(['4', '3', '1', '5', '2']);
  });

  it('persiste nas chaves exatas e detecta corrupção na sessão ativa (11.4 / R-03)', () => {
    salvarPresets([PRESET_EXEMPLO]);
    expect(window.localStorage.getItem(CHAVES_STORAGE.PRESETS)).toBeTruthy();
    expect(carregarPresets().itens).toHaveLength(1);

    const tarefa: Tarefa = {
      id: 't-1',
      titulo: 'Ler capítulo 4',
      estado: 'backlog',
      prioridade: 'media',
      criadaEm: 100,
      atualizadaEm: 100,
    };
    salvarTarefas([tarefa]);
    expect(window.localStorage.getItem(CHAVES_STORAGE.TAREFAS)).toBeTruthy();
    expect(carregarTarefas().itens).toHaveLength(1);

    const sessao = criarSessaoAtiva(PRESET_EXEMPLO, 500_000);
    salvarSessaoAtiva(sessao);
    expect(carregarSessaoAtiva().sessao?.id).toBe(sessao.id);

    // Simula corrupção em Local Storage (R-03)
    window.localStorage.setItem(CHAVES_STORAGE.SESSAO_ATIVA, '{"invalido":123}');
    const corrompida = carregarSessaoAtiva();
    expect(corrompida.inconsistente).toBe(true);
    expect(corrompida.sessao).toBeNull();

    removerSessaoAtiva();
    expect(carregarSessaoAtiva().inconsistente).toBe(false);
  });
});
