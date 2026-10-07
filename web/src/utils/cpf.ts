export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

// Aplica a máscara 000.000.000-00 enquanto a pessoa digita.
export function mascararCpf(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}
