export type TipoSomAmbiente =
  | 'desativado'
  | 'chuva'
  | 'ruidoMarrom'
  | 'ondas';

class ServicoAudioPomodoro {
  private contexto: AudioContext | null = null;
  private noFonteAmbiente: AudioBufferSourceNode | null = null;
  private noGanhoAmbiente: GainNode | null = null;
  private noLfoAmbiente: OscillatorNode | null = null;
  private tipoAmbienteAtual: TipoSomAmbiente = 'desativado';
  private volumeAmbiente = 0.25;

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
      osc.frequency.setValueAtTime(523.25, agora); // Dó5
      osc.frequency.exponentialRampToValueAtTime(659.25, agora + 0.12); // Mi5

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

      const notas = [523.25, 659.25, 783.99, 1046.5]; // Dó5, Mi5, Sol5, Dó6
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

  /**
   * Funcionalidade opcional permitida pela especificação: Som ambiente sintetizado
   * via Web Audio API para auxiliar na concentração durante sessões de estudo.
   */
  public configurarSomAmbiente(tipo: TipoSomAmbiente, volume?: number): void {
    if (typeof volume === 'number') {
      this.volumeAmbiente = Math.min(1, Math.max(0, volume));
    }

    if (tipo === this.tipoAmbienteAtual && this.noGanhoAmbiente && this.contexto) {
      this.noGanhoAmbiente.gain.setTargetAtTime(
        this.volumeAmbiente * 0.35,
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

      const segundosBuffer = 4;
      const tamanhoBuffer = ctx.sampleRate * segundosBuffer;
      const buffer = ctx.createBuffer(1, tamanhoBuffer, ctx.sampleRate);
      const canal = buffer.getChannelData(0);

      let ultimoValor = 0;
      for (let i = 0; i < tamanhoBuffer; i++) {
        const branco = Math.random() * 2 - 1;
        if (tipo === 'ruidoMarrom' || tipo === 'ondas') {
          ultimoValor = (ultimoValor + 0.02 * branco) / 1.02;
          canal[i] = ultimoValor * 3.2;
        } else {
          // Chuva suave: ruído rosa/branco filtrado
          ultimoValor = 0.88 * ultimoValor + 0.12 * branco;
          canal[i] = ultimoValor * 1.8;
        }
      }

      const fonte = ctx.createBufferSource();
      fonte.buffer = buffer;
      fonte.loop = true;

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value =
        tipo === 'chuva' ? 1200 : tipo === 'ondas' ? 480 : 360;

      const ganho = ctx.createGain();
      ganho.gain.value = this.volumeAmbiente * 0.35;

      fonte.connect(filtro);
      filtro.connect(ganho);
      ganho.connect(ctx.destination);

      if (tipo === 'ondas') {
        const lfo = ctx.createOscillator();
        const ganhoLfo = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.14; // Ciclo calmo de ~7 segundos
        ganhoLfo.gain.value = 220;
        lfo.connect(ganhoLfo);
        ganhoLfo.connect(filtro.frequency);
        lfo.start();
        this.noLfoAmbiente = lfo;
      }

      fonte.start();
      this.noFonteAmbiente = fonte;
      this.noGanhoAmbiente = ganho;
    } catch {
      this.tipoAmbienteAtual = 'desativado';
    }
  }

  public ajustarVolumeAmbiente(volume: number): void {
    this.volumeAmbiente = Math.min(1, Math.max(0, volume));
    if (this.noGanhoAmbiente && this.contexto) {
      this.noGanhoAmbiente.gain.setTargetAtTime(
        this.volumeAmbiente * 0.35,
        this.contexto.currentTime,
        0.05
      );
    }
  }

  public pararSomAmbiente(): void {
    try {
      if (this.noFonteAmbiente) {
        this.noFonteAmbiente.stop();
        this.noFonteAmbiente.disconnect();
      }
      if (this.noLfoAmbiente) {
        this.noLfoAmbiente.stop();
        this.noLfoAmbiente.disconnect();
      }
      if (this.noGanhoAmbiente) {
        this.noGanhoAmbiente.disconnect();
      }
    } catch {
      // Ignora desconexões já finalizadas
    } finally {
      this.noFonteAmbiente = null;
      this.noLfoAmbiente = null;
      this.noGanhoAmbiente = null;
      this.tipoAmbienteAtual = 'desativado';
    }
  }
}

export const servicoAudio = new ServicoAudioPomodoro();
