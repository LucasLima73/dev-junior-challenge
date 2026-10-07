import { useCallback, useEffect, useState } from 'react';
import { CheckinForm } from './components/CheckinForm';
import { CheckinQueue } from './components/CheckinQueue';
import { Pagination } from './components/Pagination';
import { atenderCheckin, listarFila } from './api';
import type { Checkin, StatusFiltro } from './types';

const INTERVALO_ATUALIZACAO_MS = 5000;
const TAMANHO_PAGINA = 5;

export default function App() {
  const [fila, setFila] = useState<Checkin[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<StatusFiltro>('pendentes');
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erroFila, setErroFila] = useState('');
  const [atendendoId, setAtendendoId] = useState<string | null>(null);

  const atualizarFila = useCallback(async () => {
    try {
      const resultado = await listarFila({ status, pagina, tamanhoPagina: TAMANHO_PAGINA });
      setFila(resultado.itens);
      setTotal(resultado.total);
      setErroFila('');
    } catch {
      setErroFila('Não foi possível atualizar a fila. A API está no ar?');
    } finally {
      setCarregando(false);
    }
  }, [status, pagina]);

  // Carrega a fila ao abrir a tela (ou ao trocar filtro/página) e mantém
  // atualizada sozinha, para a recepção ver novos check-ins sem recarregar.
  useEffect(() => {
    // Busca de dados (não deriva de prop/state), por isso o setState aqui é intencional.
    // oxlint-disable-next-line react/set-state-in-effect
    void atualizarFila();
    const intervalo = setInterval(atualizarFila, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [atualizarFila]);

  async function aoAtender(id: string) {
    setAtendendoId(id);
    try {
      await atenderCheckin(id);
      await atualizarFila();
    } catch {
      setErroFila('Não foi possível marcar o check-in como atendido.');
    } finally {
      setAtendendoId(null);
    }
  }

  function aoTrocarStatus(novoStatus: StatusFiltro) {
    setCarregando(true);
    setStatus(novoStatus);
    setPagina(1);
  }

  function aoMudarPagina(novaPagina: number) {
    setCarregando(true);
    setPagina(novaPagina);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  return (
    <div className="pagina">
      <header>
        <h1>Check-in de pacientes</h1>
      </header>

      <main className="conteudo">
        <section className="cartao">
          <h2>Novo check-in</h2>
          <CheckinForm onCheckinCriado={() => void atualizarFila()} />
        </section>

        <section className="cartao">
          <div className="fila-cabecalho">
            <h2>Fila de atendimento</h2>
            <select
              className="filtro-status"
              value={status}
              onChange={(e) => aoTrocarStatus(e.target.value as StatusFiltro)}
            >
              <option value="pendentes">Pendentes</option>
              <option value="atendidos">Atendidos</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          {erroFila && <p className="mensagem mensagem-erro">{erroFila}</p>}

          <CheckinQueue
            fila={fila}
            carregando={carregando}
            mostrarAcaoAtender={status !== 'atendidos'}
            atendendoId={atendendoId}
            onAtender={aoAtender}
          />

          <Pagination pagina={pagina} totalPaginas={totalPaginas} onMudarPagina={aoMudarPagina} />
        </section>
      </main>
    </div>
  );
}
