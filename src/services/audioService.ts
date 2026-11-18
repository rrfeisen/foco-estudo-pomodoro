export type TipoSomAmbiente =
  | 'desativado'
  | 'chuva'
  | 'ondas'
  | 'lareira'
  | 'ruidoMarrom';

/**
 * Cria um AudioBuffer estéreo com crossfade de potência igual nas bordas,
 * eliminando qualquer estalo ou descontinuidade ao repetir em loop.
 */
function criarBufferEstereoSemCostura(
  ctx: AudioContext,
  duracaoSegundos: number,
  geradorCanal: (totalAmostras: number, canalIdx: number, taxaAmostragem: number) => Float32Array
): AudioBuffer {
  const taxa = ctx.sampleRate;
  const amostrasLoop = Math.floor(duracaoSegundos * taxa);
  const amostrasFade = Math.floor(0.5 * taxa);
  const totalGerado = amostrasLoop + amostrasFade;

  const buffer = ctx.createBuffer(2, amostrasLoop, taxa);

  for (let c = 0; c < 2; c++) {
    const bruto = geradorCanal(totalGerado, c, taxa);
    const saida = buffer.getChannelData(c);

    for (let i = 0; i < amostrasLoop; i++) {
      saida[i] = bruto[i];
    }

    // Crossfade de potência igual entre o final excedente e o início do buffer
    for (let i = 0; i < amostrasFade; i++) {
      const progresso = i / amostrasFade;
      const ganhoInicio = Math.sin(progresso * Math.PI * 0.5);
      const ganhoCauda = Math.cos(progresso * Math.PI * 0.5);
      saida[i] =
        bruto[i] * ganhoInicio + bruto[amostrasLoop + i] * ganhoCauda;
    }
  }

  return buffer;
}

/**
 * Gerador de Ruído Rosa preciso (filtro de 7 estágios de Paul Kellet, -3dB/oitava).
 */
function gerarRuidoRosa(totalAmostras: number): Float32Array {
  const dados = new Float32Array(totalAmostras);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;

  for (let i = 0; i < totalAmostras; i++) {
    const branco = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + branco * 0.0555179;
    b1 = 0.99332 * b1 + branco * 0.0750759;
    b2 = 0.96900 * b2 + branco * 0.1538520;
    b3 = 0.86650 * b3 + branco * 0.3104856;
    b4 = 0.55000 * b4 + branco * 0.5329522;
    b5 = -0.7616 * b5 - branco * 0.0168980;
    const rosa = b0 + b1 + b2 + b3 + b4 + b5 + b6 + branco * 0.5362;
    b6 = branco * 0.115926;
    dados[i] = rosa * 0.11;
  }

  return dados;
}

/**
 * Gerador de Ruído Marrom (Brownian noise, -6dB/oitava) normalizado e suave.
 */
function gerarRuidoMarrom(totalAmostras: number): Float32Array {
  const dados = new Float32Array(totalAmostras);
  let ultimo = 0;
  let pico = 0.001;

  for (let i = 0; i < totalAmostras; i++) {
    const branco = Math.random() * 2 - 1;
    ultimo = (ultimo + 0.018 * branco) / 1.018;
    dados[i] = ultimo;
    const abs = Math.abs(ultimo);
    if (abs > pico) pico = abs;
  }

  const escala = 0.7 / pico;
  for (let i = 0; i < totalAmostras; i++) {
    dados[i] *= escala;
  }

  return dados;
}

/**
 * Gerador estocástico de gotas de água caindo (pingos suaves de chuva).
 */
function gerarGotasDeChuva(
  totalAmostras: number,
  taxaAmostragem: number
): Float32Array {
  const dados = new Float32Array(totalAmostras);
  const duracaoSeg = totalAmostras / taxaAmostragem;
  const quantidadeGotas = Math.floor(duracaoSeg * 38);

  for (let g = 0; g < quantidadeGotas; g++) {
    const inicio = Math.floor(Math.random() * (totalAmostras - 2000));
    const duracaoAmostras = Math.floor(
      taxaAmostragem * (0.008 + Math.random() * 0.022)
    );
    const freqInicial = 950 + Math.random() * 2200;
    const amplitude = 0.06 + Math.random() * 0.14;

    for (let k = 0; k < duracaoAmostras && inicio + k < totalAmostras; k++) {
      const t = k / taxaAmostragem;
      const env = Math.exp(-k / (duracaoAmostras * 0.24));
      // Ligeira subida de frequência típica de bolha/pingo d'água + textura suave
      const freq = freqInicial * (1 + 0.35 * (k / duracaoAmostras));
      const tomPingo = Math.sin(2 * Math.PI * freq * t);
      const impacto = (Math.random() * 2 - 1) * Math.exp(-k / (duracaoAmostras * 0.08));
      dados[inicio + k] += (tomPingo * 0.55 + impacto * 0.45) * amplitude * env;
    }
  }

  return dados;
}

/**
 * Gerador estocástico de estalos e crepitações de lenha na lareira.
 */
function gerarEstalosLareira(
  totalAmostras: number,
  taxaAmostragem: number
): Float32Array {
  const dados = new Float32Array(totalAmostras);
  const duracaoSeg = totalAmostras / taxaAmostragem;

  // 1) Estalos finos e agudos de gravetos (em pequenos agrupamentos naturais)
  const gruposEstalo = Math.floor(duracaoSeg * 5.5);
  for (let c = 0; c < gruposEstalo; c++) {
    const baseGrupo = Math.floor(Math.random() * (totalAmostras - 8000));
    const subEstalos = 1 + Math.floor(Math.random() * 4);

    for (let s = 0; s < subEstalos; s++) {
      const inicio =
        baseGrupo + Math.floor(Math.random() * taxaAmostragem * 0.14);
      const dur = Math.floor(taxaAmostragem * (0.002 + Math.random() * 0.006));
      const amp = 0.18 + Math.random() * 0.38;

      for (let k = 0; k < dur && inicio + k < totalAmostras; k++) {
        const env = Math.exp(-k / (dur * 0.22));
        dados[inicio + k] += (Math.random() * 2 - 1) * amp * env;
      }
    }
  }

  // 2) "Pops" médios/graves de brasa de madeira
  const popsBrasa = Math.floor(duracaoSeg * 1.8);
  for (let p = 0; p < popsBrasa; p++) {
    const inicio = Math.floor(Math.random() * (totalAmostras - 4000));
    const dur = Math.floor(taxaAmostragem * (0.012 + Math.random() * 0.025));
    const freq = 220 + Math.random() * 340;
    const amp = 0.14 + Math.random() * 0.22;

    for (let k = 0; k < dur && inicio + k < totalAmostras; k++) {
      const t = k / taxaAmostragem;
      const env = Math.exp(-k / (dur * 0.25));
      dados[inicio + k] += Math.sin(2 * Math.PI * freq * t) * amp * env;
    }
  }

  return dados;
}

class ServicoAudioPomodoro {
  private contexto: AudioContext | null = null;
  private ganhoMestreAmbiente: GainNode | null = null;
  private fontesAtivas: AudioScheduledSourceNode[] = [];
  private nosAtivos: AudioNode[] = [];
  private tipoAmbienteAtual: TipoSomAmbiente = 'desativado';
  private volumeAmbiente = 0.4;

  private obterContexto(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const ConstrutorAudio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!ConstrutorAudio) return null;

    if (!this.contexto) {
      this.contexto = new ConstrutorAudio();
    }
    return this.contexto;
  }

  /**
   * R-01: Desbloqueia e mantém ativo o contexto de áudio após clique em "Iniciar",
   * emitindo um sutil som de confirmação inicial.
   */
  public emitirToqueInicioSessao(): void {
    try {
      const ctx = this.obterContexto();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const agora = ctx.currentTime;
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, agora);
      osc.frequency.exponentialRampToValueAtTime(659.25, agora + 0.12);

      ganho.gain.setValueAtTime(0.001, agora);
      ganho.gain.exponentialRampToValueAtTime(0.12, agora + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.22);

      osc.connect(ganho);
      ganho.connect(ctx.destination);

      osc.start(agora);
      osc.stop(agora + 0.24);
    } catch {
      // Ignora silenciosamente caso o navegador bloqueie áudio
    }
  }

  /**
   * RF-14 / RN-13 / RNF-10: Emite alerta sonoro audível ao fim de cada fase.
   */
  public emitirAlertaFimDeFase(): void {
    try {
      const ctx = this.obterContexto();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const notas = [523.25, 659.25, 783.99, 1046.5];
      const agora = ctx.currentTime;

      notas.forEach((frequencia, indice) => {
        const inicio = agora + indice * 0.16;
        const duracao = indice === notas.length - 1 ? 0.55 : 0.24;

        const osc = ctx.createOscillator();
        const ganho = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequencia, inicio);

        ganho.gain.setValueAtTime(0.001, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.24, inicio + 0.025);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

        osc.connect(ganho);
        ganho.connect(ctx.destination);

        osc.start(inicio);
        osc.stop(inicio + duracao + 0.02);
      });
    } catch {
      // Respeita políticas de reprodução automática do navegador (RNF-10)
    }
  }

  private registrarNo<T extends AudioNode>(no: T): T {
    this.nosAtivos.push(no);
    return no;
  }

  private registrarFonte<T extends AudioScheduledSourceNode>(fonte: T): T {
    this.fontesAtivas.push(fonte);
    this.nosAtivos.push(fonte);
    return fonte;
  }

  /**
   * Configura síntese acústica realista de som ambiente via Web Audio API:
   * - Chuva na Janela: cortina estéreo de chuva (ruído rosa filtrado) + gotas d'água estocásticas
   * - Ondas do Mar: duas frentes de ondas estéreo com modulação sincronizada de volume e espuma
   * - Lareira Suave: sopro quente de brasa + crepitações e estalos naturais de lenha
   * - Ruído Marrom: grave profundo, contínuo e aveludado para bloqueio de distrações
   */
  public configurarSomAmbiente(tipo: TipoSomAmbiente, volume?: number): void {
    if (typeof volume === 'number') {
      this.volumeAmbiente = Math.min(1, Math.max(0, volume));
    }

    if (
      tipo === this.tipoAmbienteAtual &&
      this.ganhoMestreAmbiente &&
      this.contexto
    ) {
      this.ganhoMestreAmbiente.gain.setTargetAtTime(
        this.volumeAmbiente * 0.7,
        this.contexto.currentTime,
        0.08
      );
      return;
    }

    this.pararSomAmbiente();
    this.tipoAmbienteAtual = tipo;

    if (tipo === 'desativado') {
      return;
    }

    try {
      const ctx = this.obterContexto();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const mestre = this.registrarNo(ctx.createGain());
      mestre.gain.setValueAtTime(0.001, ctx.currentTime);
      mestre.gain.setTargetAtTime(
        this.volumeAmbiente * 0.7,
        ctx.currentTime,
        0.18
      );
      mestre.connect(ctx.destination);
      this.ganhoMestreAmbiente = mestre;

      if (tipo === 'chuva') {
        this.montarChuva(ctx, mestre);
      } else if (tipo === 'ondas') {
        this.montarOndasDoMar(ctx, mestre);
      } else if (tipo === 'lareira') {
        this.montarLareira(ctx, mestre);
      } else if (tipo === 'ruidoMarrom') {
        this.montarRuidoMarrom(ctx, mestre);
      }
    } catch {
      this.tipoAmbienteAtual = 'desativado';
    }
  }

  private montarChuva(ctx: AudioContext, destino: AudioNode): void {
    // Camada 1: Cortina contínua de chuva (ruído rosa estéreo moldado entre 500 Hz e 4200 Hz)
    const bufferBase = criarBufferEstereoSemCostura(ctx, 10, (n) =>
      gerarRuidoRosa(n)
    );
    const fonteBase = this.registrarFonte(ctx.createBufferSource());
    fonteBase.buffer = bufferBase;
    fonteBase.loop = true;

    const passaAlta = this.registrarNo(ctx.createBiquadFilter());
    passaAlta.type = 'highpass';
    passaAlta.frequency.value = 520;

    const passaBaixa = this.registrarNo(ctx.createBiquadFilter());
    passaBaixa.type = 'lowpass';
    passaBaixa.frequency.value = 4200;

    const ganhoBase = this.registrarNo(ctx.createGain());
    ganhoBase.gain.value = 0.65;

    fonteBase.connect(passaAlta);
    passaAlta.connect(passaBaixa);
    passaBaixa.connect(ganhoBase);
    ganhoBase.connect(destino);

    // Camada 2: Pingos e respingos individuais de água (duração 11.7s para nunca coincidir com 10s)
    const bufferGotas = criarBufferEstereoSemCostura(
      ctx,
      11.7,
      (n, _c, taxa) => gerarGotasDeChuva(n, taxa)
    );
    const fonteGotas = this.registrarFonte(ctx.createBufferSource());
    fonteGotas.buffer = bufferGotas;
    fonteGotas.loop = true;

    const filtroGotas = this.registrarNo(ctx.createBiquadFilter());
    filtroGotas.type = 'bandpass';
    filtroGotas.frequency.value = 1850;
    filtroGotas.Q.value = 0.75;

    const ganhoGotas = this.registrarNo(ctx.createGain());
    ganhoGotas.gain.value = 0.85;

    fonteGotas.connect(filtroGotas);
    filtroGotas.connect(ganhoGotas);
    ganhoGotas.connect(destino);

    fonteBase.start();
    fonteGotas.start();
  }

  private montarOndasDoMar(ctx: AudioContext, destino: AudioNode): void {
    const bufferBase = criarBufferEstereoSemCostura(ctx, 12, (n) =>
      gerarRuidoRosa(n)
    );

    // Cria duas frentes de ondas defasadas (quebra na areia + ondulação de fundo)
    const configsOndas = [
      { freqCicloHz: 0.105, filtroBase: 950, filtroMod: 820, ganhoBase: 0.28, ganhoMod: 0.24 },
      { freqCicloHz: 0.068, filtroBase: 480, filtroMod: 340, ganhoBase: 0.18, ganhoMod: 0.14 },
    ];

    configsOndas.forEach((cfg) => {
      const fonte = this.registrarFonte(ctx.createBufferSource());
      fonte.buffer = bufferBase;
      fonte.loop = true;

      const filtroEspuma = this.registrarNo(ctx.createBiquadFilter());
      filtroEspuma.type = 'lowpass';
      filtroEspuma.frequency.value = cfg.filtroBase;
      filtroEspuma.Q.value = 0.6;

      const ganhoOnda = this.registrarNo(ctx.createGain());
      ganhoOnda.gain.value = cfg.ganhoBase;

      // LFO sincronizando volume da onda e brilho da espuma ao quebrar na praia
      const lfo = this.registrarFonte(ctx.createOscillator());
      lfo.type = 'sine';
      lfo.frequency.value = cfg.freqCicloHz;

      const lfoParaGanho = this.registrarNo(ctx.createGain());
      lfoParaGanho.gain.value = cfg.ganhoMod;

      const lfoParaFiltro = this.registrarNo(ctx.createGain());
      lfoParaFiltro.gain.value = cfg.filtroMod;

      lfo.connect(lfoParaGanho);
      lfoParaGanho.connect(ganhoOnda.gain);

      lfo.connect(lfoParaFiltro);
      lfoParaFiltro.connect(filtroEspuma.frequency);

      fonte.connect(filtroEspuma);
      filtroEspuma.connect(ganhoOnda);
      ganhoOnda.connect(destino);

      lfo.start();
      fonte.start();
    });
  }

  private montarLareira(ctx: AudioContext, destino: AudioNode): void {
    // Camada 1: Sopro quente e grave da brasa
    const bufferBrasa = criarBufferEstereoSemCostura(ctx, 9, (n) =>
      gerarRuidoMarrom(n)
    );
    const fonteBrasa = this.registrarFonte(ctx.createBufferSource());
    fonteBrasa.buffer = bufferBrasa;
    fonteBrasa.loop = true;

    const filtroBrasa = this.registrarNo(ctx.createBiquadFilter());
    filtroBrasa.type = 'lowpass';
    filtroBrasa.frequency.value = 210;

    const ganhoBrasa = this.registrarNo(ctx.createGain());
    ganhoBrasa.gain.value = 0.42;

    fonteBrasa.connect(filtroBrasa);
    filtroBrasa.connect(ganhoBrasa);
    ganhoBrasa.connect(destino);

    // Camada 2: Estalos de gravetos e crepitação da madeira
    const bufferEstalos = criarBufferEstereoSemCostura(
      ctx,
      13.3,
      (n, _c, taxa) => gerarEstalosLareira(n, taxa)
    );
    const fonteEstalos = this.registrarFonte(ctx.createBufferSource());
    fonteEstalos.buffer = bufferEstalos;
    fonteEstalos.loop = true;

    const passaAltaEstalos = this.registrarNo(ctx.createBiquadFilter());
    passaAltaEstalos.type = 'highpass';
    passaAltaEstalos.frequency.value = 180;

    const passaBaixaEstalos = this.registrarNo(ctx.createBiquadFilter());
    passaBaixaEstalos.type = 'lowpass';
    passaBaixaEstalos.frequency.value = 5200;

    const ganhoEstalos = this.registrarNo(ctx.createGain());
    ganhoEstalos.gain.value = 0.85;

    fonteEstalos.connect(passaAltaEstalos);
    passaAltaEstalos.connect(passaBaixaEstalos);
    passaBaixaEstalos.connect(ganhoEstalos);
    ganhoEstalos.connect(destino);

    fonteBrasa.start();
    fonteEstalos.start();
  }

  private montarRuidoMarrom(ctx: AudioContext, destino: AudioNode): void {
    const bufferMarrom = criarBufferEstereoSemCostura(ctx, 10, (n) =>
      gerarRuidoMarrom(n)
    );
    const fonte = this.registrarFonte(ctx.createBufferSource());
    fonte.buffer = bufferMarrom;
    fonte.loop = true;

    const passaAlta = this.registrarNo(ctx.createBiquadFilter());
    passaAlta.type = 'highpass';
    passaAlta.frequency.value = 40;

    const passaBaixa = this.registrarNo(ctx.createBiquadFilter());
    passaBaixa.type = 'lowpass';
    passaBaixa.frequency.value = 460;

    const ganho = this.registrarNo(ctx.createGain());
    ganho.gain.value = 0.72;

    fonte.connect(passaAlta);
    passaAlta.connect(passaBaixa);
    passaBaixa.connect(ganho);
    ganho.connect(destino);

    fonte.start();
  }

  public ajustarVolumeAmbiente(volume: number): void {
    this.volumeAmbiente = Math.min(1, Math.max(0, volume));
    if (this.ganhoMestreAmbiente && this.contexto) {
      this.ganhoMestreAmbiente.gain.setTargetAtTime(
        this.volumeAmbiente * 0.7,
        this.contexto.currentTime,
        0.05
      );
    }
  }

  public pararSomAmbiente(): void {
    for (const fonte of this.fontesAtivas) {
      try {
        fonte.stop();
      } catch {
        // Fonte já finalizada
      }
    }
    for (const no of this.nosAtivos) {
      try {
        no.disconnect();
      } catch {
        // Nó já desconectado
      }
    }
    this.fontesAtivas = [];
    this.nosAtivos = [];
    this.ganhoMestreAmbiente = null;
    this.tipoAmbienteAtual = 'desativado';
  }
}

export const servicoAudio = new ServicoAudioPomodoro();
