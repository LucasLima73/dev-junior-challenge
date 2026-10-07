import type { Checkin } from './checkin.entity.js';

export interface CriarCheckinDados {
  cpf: string;
  nome: string;
  chegadaEm: Date;
}

export type StatusFiltro = 'pendentes' | 'atendidos' | 'todos';

export interface ListarEntreOpcoes {
  status?: StatusFiltro;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface ResultadoPaginado {
  itens: Checkin[];
  total: number;
}

// Interface "burra": sabe gravar e consultar por intervalo de data, mas não
// conhece a regra de negócio (duplicidade, fila do dia) — isso fica no
// CheckinService, que roda igual com qualquer implementação.
export interface CheckinRepository {
  criar(dados: CriarCheckinDados): Promise<Checkin>;
  listarEntre(inicio: Date, fim: Date, opcoes?: ListarEntreOpcoes): Promise<ResultadoPaginado>;
  marcarComoAtendido(id: string, atendidoEm: Date): Promise<Checkin | null>;
}

export const CHECKIN_REPOSITORY = Symbol('CHECKIN_REPOSITORY');
