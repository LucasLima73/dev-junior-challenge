interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  onMudarPagina: (pagina: number) => void;
}

export function Pagination({ pagina, totalPaginas, onMudarPagina }: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="paginacao">
      <button type="button" disabled={pagina <= 1} onClick={() => onMudarPagina(pagina - 1)}>
        ← Anterior
      </button>
      <span>
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onMudarPagina(pagina + 1)}
      >
        Próxima →
      </button>
    </div>
  );
}
