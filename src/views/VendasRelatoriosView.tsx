import { NavegacaoSecoes } from '../components/ui/NavegacaoSecoes';
import React, { useState } from 'react';
import { Store, Users, FileText, TrendingUp } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { RevendasTab } from '../components/RevendasTab';
import { ClientesTab } from '../components/ClientesTab';
import { RelatoriosPdfTab } from '../components/RelatoriosPdfTab';

type AbaVendas = 'revendas' | 'clientes' | 'relatorios';

// Vendas & Relatórios (menu Produção): revenda de produtos do estoque,
// cadastro de clientes e relatórios em PDF. Usa as mesmas permissões do
// módulo Compras, de onde estas abas vieram.
export const VendasRelatoriosView: React.FC = () => {
  const { canWriteModule } = useCoop();
  const canWrite = canWriteModule('compras');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<AbaVendas | null>(null);

  const abas: { id: AbaVendas; label: string; descricao: string; icon: React.ElementType }[] = [
    { id: 'revendas', label: 'Revendas de Produtos', descricao: 'Registre e consulte as revendas do estoque.', icon: Store },
    { id: 'clientes', label: 'Clientes', descricao: 'Gerencie o cadastro de clientes.', icon: Users },
    { id: 'relatorios', label: 'Relatórios PDF', descricao: 'Consulte e exporte os relatórios de vendas.', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 bg-slate-100 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
          <TrendingUp className="w-3.5 h-3.5" /> Comercialização da Cooperativa
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vendas & Relatórios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revenda de produtos do estoque, cadastro de clientes e relatórios em PDF de compras, vendas, contas e impostos.
        </p>
      </div>

      <NavegacaoSecoes selecionada={activeTab !== null} voltar={() => setActiveTab(null)} secoes={abas.map(aba => ({
        titulo: aba.label, descricao: aba.descricao, icone: aba.icon, abrir: () => setActiveTab(aba.id)
      }))} />

      {activeTab === 'revendas' && <RevendasTab canWrite={canWrite} onBlocked={blockWriteAction} />}
      {activeTab === 'clientes' && <ClientesTab canWrite={canWrite} onBlocked={blockWriteAction} />}
      {activeTab === 'relatorios' && <RelatoriosPdfTab tipoInicial="VENDAS" />}
    </div>
  );
};

export default VendasRelatoriosView;
