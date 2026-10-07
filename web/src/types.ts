export interface Checkin {
  id: string;
  cpf: string;
  nome: string;
  chegadaEm: string;
  atendidoEm: string | null;
}

export type StatusFiltro = 'pendentes' | 'atendidos' | 'todos';

export interface FilaPaginada {
  itens: Checkin[];
  total: number;
}
