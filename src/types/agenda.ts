// Agenda & Atividades: tarefas da equipe com status e responsável.
export type StatusAtividade = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type PrioridadeAtividade = 'BAIXA' | 'MEDIA' | 'ALTA';

export interface Atividade {
  id: string;
  tenantId: string;
  titulo: string;
  descricao?: string;
  /** Id do usuário do sistema responsável (quando escolhido da equipe). */
  responsavelId?: string;
  /** Nome exibido do responsável (usuário da equipe ou nome digitado). */
  responsavelNome: string;
  status: StatusAtividade;
  prioridade: PrioridadeAtividade;
  /** Prazo no formato AAAA-MM-DD. */
  prazo?: string;
  /** E-mail do responsável, usado para o convite da Google Agenda. */
  responsavelEmail?: string;
  /** Quando true (padrão), o prazo vai para a Google Agenda. */
  sincronizarAgenda?: boolean;
  /** Evento criado na Google Agenda de quem lançou a atividade. */
  googleEventId?: string;
  /** Conta Google em cuja agenda o evento fica (dono do evento). */
  agendaDonoEmail?: string;
  /** Alteração ainda não enviada à Google Agenda (agenda desconectada). */
  agendaPendente?: boolean;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm?: string;
  concluidoEm?: string;
}

export const STATUS_ATIVIDADE: { valor: StatusAtividade; rotulo: string }[] = [
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em andamento' },
  { valor: 'CONCLUIDA', rotulo: 'Concluída' },
  { valor: 'CANCELADA', rotulo: 'Cancelada' }
];

export const rotuloStatusAtividade = (s?: string) =>
  STATUS_ATIVIDADE.find(x => x.valor === s)?.rotulo || s || '';
