/**
 * Formatar valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formatar data
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatar data relativa (ex: "há 2 horas")
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'agora mesmo';
  if (diffInMinutes < 60) return `há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
}

