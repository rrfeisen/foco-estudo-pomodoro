import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  variante?: 'perigo' | 'aviso';
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  variante = 'perigo',
  aoConfirmar,
  aoCancelar,
}) => {
  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    botaoConfirmarRef.current?.focus();

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        aoCancelar();
      }
    };

    window.addEventListener('keydown', aoPressionarTecla);
    return () => window.removeEventListener('keydown', aoPressionarTecla);
  }, [aberto, aoCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoCancelar();
      }}
    >
      <div
        className="modal-card modal-confirmacao"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div className="modal-confirmacao-topo">
          <div className={`icone-alerta icone-alerta--${variante}`} aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="modal-titulo">
              {titulo}
            </h2>
            <p id="confirm-dialog-desc" className="modal-descricao">
              {mensagem}
            </p>
          </div>
        </div>

        <div className="modal-acoes">
          <button
            type="button"
            className="btn btn-secundario"
            onClick={aoCancelar}
          >
            {rotuloCancelar}
          </button>
          <button
            ref={botaoConfirmarRef}
            type="button"
            className={`btn ${
              variante === 'perigo' ? 'btn-perigo' : 'btn-primario'
            }`}
            onClick={aoConfirmar}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
