import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TemporizadorPersonalizado } from '../domain/types';
import { ErrosPreset, validarDadosPreset } from '../domain/validation';

export interface PresetFormModalProps {
  aberto: boolean;
  presetEmEdicao: TemporizadorPersonalizado | null;
  aoSalvar: (dados: {
    nome: string;
    tempoFocoMin: number;
    tempoPausaCurtaMin: number;
    ciclosAntesPausaLonga: number;
    tempoPausaLongaMin: number;
  }) => void;
  aoCancelar: () => void;
}

export const PresetFormModal: React.FC<PresetFormModalProps> = ({
  aberto,
  presetEmEdicao,
  aoSalvar,
  aoCancelar,
}) => {
  const [nome, setNome] = useState('');
  const [tempoFocoMin, setTempoFocoMin] = useState('25');
  const [tempoPausaCurtaMin, setTempoPausaCurtaMin] = useState('5');
  const [ciclosAntesPausaLonga, setCiclosAntesPausaLonga] = useState('4');
  const [tempoPausaLongaMin, setTempoPausaLongaMin] = useState('15');
  const [erros, setErros] = useState<ErrosPreset>({});

  const campoNomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;

    if (presetEmEdicao) {
      setNome(presetEmEdicao.nome);
      setTempoFocoMin(String(presetEmEdicao.tempoFocoMin));
      setTempoPausaCurtaMin(String(presetEmEdicao.tempoPausaCurtaMin));
      setCiclosAntesPausaLonga(String(presetEmEdicao.ciclosAntesPausaLonga));
      setTempoPausaLongaMin(String(presetEmEdicao.tempoPausaLongaMin));
    } else {
      setNome('');
      setTempoFocoMin('25');
      setTempoPausaCurtaMin('5');
      setCiclosAntesPausaLonga('4');
      setTempoPausaLongaMin('15');
    }
    setErros({});

    const timer = window.setTimeout(() => campoNomeRef.current?.focus(), 20);
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
  }, [aberto, presetEmEdicao, aoCancelar]);

  if (!aberto) return null;

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const resultado = validarDadosPreset({
      nome,
      tempoFocoMin,
      tempoPausaCurtaMin,
      ciclosAntesPausaLonga,
      tempoPausaLongaMin,
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
        aria-labelledby="modal-preset-titulo"
      >
        <div className="modal-cabecalho">
          <h2 id="modal-preset-titulo" className="modal-titulo">
            {presetEmEdicao
              ? 'Editar Temporizador Personalizado'
              : 'Novo Temporizador Personalizado'}
          </h2>
          <button
            type="button"
            className="btn-icone"
            aria-label="Fechar formulário de temporizador"
            onClick={aoCancelar}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submeter} noValidate className="formulario">
          <div className="campo-grupo">
            <label htmlFor="preset-nome" className="campo-rotulo">
              Nome do temporizador <span className="obrigatorio">*</span>
            </label>
            <input
              ref={campoNomeRef}
              id="preset-nome"
              type="text"
              className={`campo-input ${erros.nome ? 'campo-input--erro' : ''}`}
              placeholder="Ex.: Cálculo II — Revisão"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erros.nome) setErros((prev) => ({ ...prev, nome: undefined }));
              }}
              aria-invalid={Boolean(erros.nome)}
              aria-describedby={erros.nome ? 'erro-preset-nome' : 'dica-preset-nome'}
            />
            <div className="campo-rodape">
              <span id="dica-preset-nome" className="campo-dica">
                Entre 1 e 40 caracteres ({nome.trim().length}/40)
              </span>
            </div>
            {erros.nome && (
              <p id="erro-preset-nome" className="campo-erro" role="alert">
                {erros.nome}
              </p>
            )}
          </div>

          <div className="grade-campos-2">
            <div className="campo-grupo">
              <label htmlFor="preset-foco" className="campo-rotulo">
                Tempo de foco (min) <span className="obrigatorio">*</span>
              </label>
              <input
                id="preset-foco"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                step={1}
                className={`campo-input ${
                  erros.tempoFocoMin ? 'campo-input--erro' : ''
                }`}
                value={tempoFocoMin}
                onChange={(e) => {
                  setTempoFocoMin(e.target.value);
                  if (erros.tempoFocoMin)
                    setErros((prev) => ({ ...prev, tempoFocoMin: undefined }));
                }}
                aria-invalid={Boolean(erros.tempoFocoMin)}
                aria-describedby={
                  erros.tempoFocoMin ? 'erro-preset-foco' : 'dica-preset-foco'
                }
              />
              <span id="dica-preset-foco" className="campo-dica">
                1 a 120 minutos
              </span>
              {erros.tempoFocoMin && (
                <p id="erro-preset-foco" className="campo-erro" role="alert">
                  {erros.tempoFocoMin}
                </p>
              )}
            </div>

            <div className="campo-grupo">
              <label htmlFor="preset-pausa-curta" className="campo-rotulo">
                Pausa curta (min) <span className="obrigatorio">*</span>
              </label>
              <input
                id="preset-pausa-curta"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                step={1}
                className={`campo-input ${
                  erros.tempoPausaCurtaMin ? 'campo-input--erro' : ''
                }`}
                value={tempoPausaCurtaMin}
                onChange={(e) => {
                  setTempoPausaCurtaMin(e.target.value);
                  if (erros.tempoPausaCurtaMin)
                    setErros((prev) => ({
                      ...prev,
                      tempoPausaCurtaMin: undefined,
                    }));
                }}
                aria-invalid={Boolean(erros.tempoPausaCurtaMin)}
                aria-describedby={
                  erros.tempoPausaCurtaMin
                    ? 'erro-preset-curta'
                    : 'dica-preset-curta'
                }
              />
              <span id="dica-preset-curta" className="campo-dica">
                1 a 60 minutos
              </span>
              {erros.tempoPausaCurtaMin && (
                <p id="erro-preset-curta" className="campo-erro" role="alert">
                  {erros.tempoPausaCurtaMin}
                </p>
              )}
            </div>

            <div className="campo-grupo">
              <label htmlFor="preset-ciclos" className="campo-rotulo">
                Ciclos até pausa longa <span className="obrigatorio">*</span>
              </label>
              <input
                id="preset-ciclos"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                step={1}
                className={`campo-input ${
                  erros.ciclosAntesPausaLonga ? 'campo-input--erro' : ''
                }`}
                value={ciclosAntesPausaLonga}
                onChange={(e) => {
                  setCiclosAntesPausaLonga(e.target.value);
                  if (erros.ciclosAntesPausaLonga)
                    setErros((prev) => ({
                      ...prev,
                      ciclosAntesPausaLonga: undefined,
                    }));
                }}
                aria-invalid={Boolean(erros.ciclosAntesPausaLonga)}
                aria-describedby={
                  erros.ciclosAntesPausaLonga
                    ? 'erro-preset-ciclos'
                    : 'dica-preset-ciclos'
                }
              />
              <span id="dica-preset-ciclos" className="campo-dica">
                1 a 12 ciclos
              </span>
              {erros.ciclosAntesPausaLonga && (
                <p id="erro-preset-ciclos" className="campo-erro" role="alert">
                  {erros.ciclosAntesPausaLonga}
                </p>
              )}
            </div>

            <div className="campo-grupo">
              <label htmlFor="preset-pausa-longa" className="campo-rotulo">
                Pausa longa (min) <span className="obrigatorio">*</span>
              </label>
              <input
                id="preset-pausa-longa"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                step={1}
                className={`campo-input ${
                  erros.tempoPausaLongaMin ? 'campo-input--erro' : ''
                }`}
                value={tempoPausaLongaMin}
                onChange={(e) => {
                  setTempoPausaLongaMin(e.target.value);
                  if (erros.tempoPausaLongaMin)
                    setErros((prev) => ({
                      ...prev,
                      tempoPausaLongaMin: undefined,
                    }));
                }}
                aria-invalid={Boolean(erros.tempoPausaLongaMin)}
                aria-describedby={
                  erros.tempoPausaLongaMin
                    ? 'erro-preset-longa'
                    : 'dica-preset-longa'
                }
              />
              <span id="dica-preset-longa" className="campo-dica">
                1 a 60 minutos
              </span>
              {erros.tempoPausaLongaMin && (
                <p id="erro-preset-longa" className="campo-erro" role="alert">
                  {erros.tempoPausaLongaMin}
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
              {presetEmEdicao ? 'Salvar Alterações' : 'Criar Temporizador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
