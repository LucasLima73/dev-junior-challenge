import { useCallback, useEffect, useState } from 'react';
import { CheckinForm } from './components/CheckinForm';
import { CheckinQueue } from './components/CheckinQueue';
import { listarFila } from './api';
import type { Checkin } from './types';

const INTERVALO_ATUALIZACAO_MS = 5000;

export default function App() {
  const [fila, setFila] = useState<Checkin[]>([]);
  const [erroFila, setErroFila] = useState('');

  const atualizarFila = useCallback(async () => {
    try {
      setFila(await listarFila());
      setErroFila('');
    } catch {
      setErroFila('Não foi possível atualizar a fila. A API está no ar?');
    }
  }, []);

  // Carrega a fila ao abrir a tela e mantém atualizada sozinha, para a
  // recepção ver novos check-ins (feitos em outro totem) sem recarregar.
  useEffect(() => {
    // Busca da fila (não deriva de prop/state), por isso o setState aqui é intencional.
    // oxlint-disable-next-line react/set-state-in-effect
    void atualizarFila();
    const intervalo = setInterval(atualizarFila, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [atualizarFila]);

  return (
    <div className="pagina">
      <header>
        <h1>Check-in de pacientes</h1>
      </header>

      <main className="conteudo">
        <section className="cartao">
          <h2>Novo check-in</h2>
          <CheckinForm onCheckinCriado={(checkin) => setFila((atual) => [...atual, checkin])} />
        </section>

        <section className="cartao">
          <h2>Fila de atendimento</h2>
          {erroFila && <p className="mensagem mensagem-erro">{erroFila}</p>}
          <CheckinQueue fila={fila} />
        </section>
      </main>
    </div>
  );
}
