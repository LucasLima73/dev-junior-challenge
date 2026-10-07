import type { Checkin } from '../types';

interface CheckinQueueProps {
  fila: Checkin[];
  carregando: boolean;
  mostrarAcaoAtender: boolean;
  atendendoId: string | null;
  onAtender: (id: string) => void;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function CheckinQueue({
  fila,
  carregando,
  mostrarAcaoAtender,
  atendendoId,
  onAtender,
}: CheckinQueueProps) {
  if (carregando && fila.length === 0) {
    return <p className="fila-vazia">Carregando fila...</p>;
  }

  if (fila.length === 0) {
    return <p className="fila-vazia">Nenhum paciente aqui.</p>;
  }

  return (
    <ol className="fila">
      {fila.map((checkin, indice) => (
        <li key={checkin.id}>
          <span className="fila-posicao">{indice + 1}</span>
          <span className="fila-info">
            <span className="fila-nome">{checkin.nome}</span>
            <span className="fila-hora">
              chegou às {formatarHora(checkin.chegadaEm)}
              {checkin.atendidoEm && ` · atendido às ${formatarHora(checkin.atendidoEm)}`}
            </span>
          </span>
          {mostrarAcaoAtender && (
            <button
              type="button"
              className="botao-atender"
              disabled={atendendoId === checkin.id}
              onClick={() => onAtender(checkin.id)}
            >
              {atendendoId === checkin.id ? 'Atendendo...' : 'Atender'}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
