// Utilitários compartilhados para abrir links externos (WhatsApp, etc.) de
// forma robusta e para disparar envios de WhatsApp em lote para uma lista de
// destinatários (produtores, cooperados, escolas, motoristas...), sempre
// usando o número de telefone/WhatsApp cadastrado de cada um.

/**
 * Abre uma URL em nova aba criando e clicando um <a> real, em vez de usar
 * window.open() diretamente. Isso evita o bloqueio silencioso que muitos
 * navegadores e ambientes de preview (iframes em sandbox) aplicam a
 * chamadas de window.open() feitas de dentro de um onClick.
 */
export const abrirLinkExterno = (url: string): void => {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Falha ao abrir link externo', e);
    // Último recurso: navega na mesma aba.
    window.location.href = url;
  }
};

/** Monta a URL do WhatsApp Web/App para um número + mensagem. */
export const montarLinkWhatsApp = (telefone: string, mensagem: string): string => {
  const limpo = telefone.replace(/\D/g, '');
  // Garante o DDI 55 (Brasil) quando o número já não tem um DDI de 2 dígitos
  // seguido do DDD — números com 10 ou 11 dígitos (DDD + telefone) recebem o
  // prefixo 55 automaticamente.
  const comDDI = limpo.length <= 11 ? `55${limpo}` : limpo;
  return `https://api.whatsapp.com/send?phone=${comDDI}&text=${encodeURIComponent(mensagem)}`;
};

/** Monta a URL do WhatsApp sem número pré-definido — o usuário escolhe o
 * contato dentro do próprio WhatsApp. Usado apenas quando não há um
 * destinatário específico (ou telefone cadastrado) para direcionar o envio. */
export const montarLinkWhatsAppGenerico = (mensagem: string): string =>
  `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;

/** Extrai o melhor número de contato disponível de um cadastro qualquer. */
export const getTelefoneContato = (pessoa: {
  whatsapp?: string;
  celular?: string;
  telefone?: string;
} | null | undefined): string => {
  if (!pessoa) return '';
  return (pessoa.whatsapp || pessoa.celular || pessoa.telefone || '').trim();
};

/**
 * Envia uma mensagem via WhatsApp para uma lista de destinatários, um por
 * um, abrindo cada link com um pequeno intervalo entre eles (evita que o
 * navegador bloqueie múltiplas abas abertas ao mesmo tempo). Destinatários
 * sem telefone cadastrado são pulados e retornados em `semTelefone` para que
 * a tela possa avisar o usuário.
 */
export const enviarWhatsAppEmLote = <T extends { id: string; nome: string }>(
  destinatarios: T[],
  getTelefone: (item: T) => string,
  getMensagem: (item: T) => string,
  intervaloMs = 700
): { enviados: T[]; semTelefone: T[] } => {
  const enviados: T[] = [];
  const semTelefone: T[] = [];

  destinatarios.forEach((item, idx) => {
    const telefone = getTelefone(item);
    if (!telefone) {
      semTelefone.push(item);
      return;
    }
    enviados.push(item);
    setTimeout(() => {
      abrirLinkExterno(montarLinkWhatsApp(telefone, getMensagem(item)));
    }, idx * intervaloMs);
  });

  return { enviados, semTelefone };
};
