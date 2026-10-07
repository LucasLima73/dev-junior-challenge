import type { Checkin } from '../types';

interface CheckinQueueProps {
  fila: Checkin[];
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function CheckinQueue({ fila }: CheckinQueueProps) {
  if (fila.length === 0) {
    return <p className="fila-vazia">Nenhum paciente na fila ainda.</p>;
  }

  return (
    <ol className="fila">
      {fila.map((checkin, indice) => (
        <li key={checkin.id}>
          <span className="fila-posicao">{indice + 1}</span>
          <span className="fila-nome">{checkin.nome}</span>
          <span className="fila-hora">{formatarHora(checkin.chegadaEm)}</span>
        </li>
      ))}
    </ol>
  );
}
