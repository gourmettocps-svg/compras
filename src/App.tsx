/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  ShoppingBasket, 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Search,
  User,
  AlertTriangle,
  LayoutDashboard,
  Package,
  FileText,
  Clock,
  RotateCcw,
  PlusCircle,
  BarChart3,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, OrderItem, Unit, PastOrder } from './types';

// Constants
const STORAGE_KEY = 'horti_restaurante_v1';
const DEFAULT_UNITS: Unit[] = ['kg', 'un', 'maço', 'cx', 'bandeja'];

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'pedido' | 'config' | 'relatorio'>('pedido');
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(5000);
  const [dailyGoal, setDailyGoal] = useState<number>(400);
  const [accumulatedWeekly, setAccumulatedWeekly] = useState<number>(3450);
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<PastOrder[]>([]);

  // Admin Modal state
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<Unit>('kg');
  const [newItemPrice, setNewItemPrice] = useState<string>('');

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setItems(data.items || []);
        setWeeklyGoal(data.weeklyGoal || 5000);
        setDailyGoal(data.dailyGoal || 400);
        setAccumulatedWeekly(data.accumulatedWeekly || 0);
        setResponsibleName(data.responsibleName || '');
        setHistory(data.history || []);
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    } else {
      // Sample data
      setItems([
        { id: '1', name: 'Tomate Saladete', unit: 'kg', price: 8.9 },
        { id: '2', name: 'Alface Americana', unit: 'maço', price: 3.5 },
        { id: '3', name: 'Cebola Branca', unit: 'kg', price: 6.8 },
        { id: '4', name: 'Brócolis Ninja', unit: 'un', price: 12.0 },
        { id: '5', name: 'Cenoura Especial', unit: 'kg', price: 5.2 },
      ]);
      setWeeklyGoal(5000);
      setDailyGoal(400);
      setAccumulatedWeekly(0);
      setHistory([]);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    const data = {
      items,
      weeklyGoal,
      dailyGoal,
      accumulatedWeekly,
      responsibleName,
      history
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [items, weeklyGoal, dailyGoal, accumulatedWeekly, responsibleName, history]);

  // Derived Values
  const orderTotal = useMemo(() => {
    return order.reduce((sum, orderItem) => {
      const item = items.find(i => i.id === orderItem.itemId);
      return sum + (item?.price || 0) * orderItem.quantity;
    }, 0);
  }, [order, items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const totalConsumidoSemana = history.reduce((sum, o) => sum + o.total, 0) + accumulatedWeekly;
  const isOverDaily = orderTotal > dailyGoal;
  const isOverWeekly = (totalConsumidoSemana + orderTotal) > weeklyGoal;
  const weeklyUsagePercent = Math.min(((totalConsumidoSemana + orderTotal) / weeklyGoal) * 100, 100).toFixed(0);

  // Handlers
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setOrder(prev => {
      const existing = prev.find(i => i.itemId === itemId);
      if (existing) {
        if (quantity <= 0) return prev.filter(i => i.itemId !== itemId);
        return prev.map(i => i.itemId === itemId ? { ...i, quantity } : i);
      }
      if (quantity > 0) return [...prev, { itemId, quantity }];
      return prev;
    });
  };

  const resetOrder = () => {
    if (order.length > 0 && !confirm('Tem certeza que deseja limpar o pedido atual?')) return;
    setOrder([]);
    setResponsibleName('');
    setIsValidated(false);
  };

  const handleFinalizeOrder = () => {
    if (!responsibleName) {
      alert('Por favor, informe o nome do responsável.');
      return;
    }
    if (!isValidated) {
      alert('Por favor, confirme os itens e quantidades validando o pedido.');
      return;
    }

    // Adiciona ao histórico
    const newHistoryEntry: PastOrder = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('pt-BR'),
      total: orderTotal,
      responsible: responsibleName,
      itemCount: order.length
    };

    setHistory([newHistoryEntry, ...history]);
    
    // Opcional: Enviar para WhatsApp antes de limpar, mas o usuário quer "Finalizar"
    handleSendWhatsApp();

    // Limpa o pedido
    setOrder([]);
    setResponsibleName('');
    setIsValidated(false);
    alert('Pedido finalizado e registrado no histórico!');
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const newItem: Item = {
      id: crypto.randomUUID(),
      name: newItemName,
      unit: newItemUnit,
      price: parseFloat(newItemPrice) || 0
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    setOrder(order.filter(i => i.itemId !== id));
  };

  const handleSendWhatsApp = () => {
    const itemDetails = order.map(orderItem => {
      const item = items.find(i => i.id === orderItem.itemId);
      const subtotal = (item?.price || 0) * orderItem.quantity;
      return `${item?.name}: ${orderItem.quantity}${item?.unit} - R$ ${subtotal.toFixed(2)}`;
    }).join('\n');

    const metaStatus = isOverDaily ? '*AVISO: Pedido acima da meta diária!*' : '*Dentro da meta diária.*';
    
    const message = `*Pedido de Hortifruti - Gourmetto*
---------------------------------------
*Responsável:* ${responsibleName}
*Status:* ${isValidated ? '✅ Validado' : '❌ Pendente'}

*Itens:*
${itemDetails}

---------------------------------------
*Total do Pedido: R$ ${orderTotal.toFixed(2)}*
*Status Financeiro:* ${metaStatus}
---------------------------------------`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const clearHistory = () => {
    if (confirm('Deseja limpar todo o histórico de lançamentos?')) {
      setHistory([]);
      setAccumulatedWeekly(0);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Sidebar - Aside */}
      <aside className="hidden md:flex w-64 bg-emerald-900 text-white flex-col border-r border-emerald-800 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-emerald-800 mb-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xl">G</div>
          <span className="font-bold tracking-tight text-lg">Gourmetto</span>
        </div>
        
        <nav className="px-4 flex-1 space-y-1">
          <div 
            onClick={() => setActiveTab('pedido')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activeTab === 'pedido' ? 'bg-emerald-800 shadow-sm' : 'hover:bg-emerald-800/50 text-emerald-100'}`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'pedido' ? 'opacity-100' : 'opacity-60'}`} />
            <span className="font-medium">Painel de Pedidos</span>
          </div>
          
          <div 
            onClick={() => setActiveTab('relatorio')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activeTab === 'relatorio' ? 'bg-emerald-800 shadow-sm' : 'hover:bg-emerald-800/50 text-emerald-100'}`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'relatorio' ? 'opacity-100' : 'opacity-60'}`} />
            <span>Relatórios Fin.</span>
          </div>

          <div 
            onClick={() => setActiveTab('config')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activeTab === 'config' ? 'bg-emerald-800 shadow-sm' : 'hover:bg-emerald-800/50 text-emerald-100'}`}
          >
            <Package className={`w-5 h-5 ${activeTab === 'config' ? 'opacity-100' : 'opacity-60'}`} />
            <span>Catálogo / Admin</span>
          </div>
        </nav>

        <div className="p-6 border-t border-emerald-800">
          <div className="text-xs text-emerald-400 uppercase font-semibold mb-2">Sistema Gestão</div>
          <div className="text-sm font-medium">Gourmetto</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Dash Stats */}
        <header className="bg-white h-24 border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex-1 pr-12 max-w-2xl">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Meta Semanal: R$ {weeklyGoal.toFixed(2)}
              </span>
              <span className={`text-xs font-bold ${isOverWeekly ? 'text-red-600' : 'text-emerald-600'}`}>
                {weeklyUsagePercent}% Utilizado (Projetado)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${weeklyUsagePercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full ${isOverWeekly ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
          
          <div className="flex gap-6 pl-12 border-l border-slate-100">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium uppercase">Total Acumulado</div>
              <div className="text-lg font-bold text-slate-700">
                R$ {totalConsumidoSemana.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium uppercase">Meta do Dia</div>
              <div className="text-lg font-bold text-slate-700">R$ {dailyGoal.toFixed(2)}</div>
            </div>
          </div>
        </header>

        {/* Dynamic Context Area */}
        <div className="p-4 md:p-8 flex flex-col md:flex-row gap-8 h-full overflow-hidden">
          
          {/* Main Content Column */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'pedido' ? (
                <motion.div 
                  key="pedido-view"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar itens para o pedido..." 
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={resetOrder}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-500 hover:border-red-100 transition-all shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                    >
                      <RotateCcw size={16} />
                      <span className="hidden sm:inline">Limpar Pedido</span>
                    </button>
                  </div>

                  {filteredItems.map(item => {
                    const orderItem = order.find(oi => oi.itemId === item.id);
                    const qty = orderItem?.quantity || 0;
                    return (
                      <div 
                        key={item.id} 
                        className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-md ${qty > 0 ? 'border-emerald-300 shadow-sm' : 'border-slate-200'}`}
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shrink-0 ${qty > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                          {item.name.toLowerCase().includes('tomate') ? '🍅' : item.name.toLowerCase().includes('alface') ? '🥬' : item.name.toLowerCase().includes('cebola') ? '🧅' : item.name.toLowerCase().includes('brócolis') ? '🥦' : item.name.toLowerCase().includes('cenoura') ? '🥕' : '🥝'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{item.name}</h4>
                          <p className="text-xs text-slate-500 uppercase">{item.unit} • R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, Math.max(0, qty - (item.unit === 'un' ? 1 : 0.5)))}
                              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              value={qty || ''}
                              onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-12 h-8 text-center font-bold text-slate-700 focus:outline-none text-sm bg-white border-x border-slate-100"
                            />
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, qty + (item.unit === 'un' ? 1 : 0.5))}
                              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <div className={`text-right w-24 font-bold ${qty > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                            R$ {(qty * item.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : activeTab === 'relatorio' ? (
                <motion.div 
                  key="relatorio-view"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} className="text-emerald-600" />
                        Histórico de Lançamentos
                      </h3>
                      <button 
                        onClick={clearHistory}
                        className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100 uppercase"
                      >
                        Limpar Histórico
                      </button>
                    </div>

                    <div className="space-y-3">
                      {history.length > 0 ? (
                        history.map(order => (
                          <div key={order.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{order.date}</p>
                                <p className="text-xs text-slate-500">Responsável: {order.responsible} • {order.itemCount} itens</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-slate-700 tracking-tight">R$ {order.total.toFixed(2)}</p>
                              <p className="text-[10px] uppercase font-bold text-emerald-600">Lançamento Validado</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-bold">Nenhum lançamento registrado nesta semana.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="admin-view"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-800 border-b pb-4 flex items-center gap-2">
                    <PlusCircle size={20} className="text-emerald-600" />
                    Gestão do Catálogo
                  </h3>
                  
                  <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Nome do Produto</label>
                      <input 
                        type="text" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all shadow-sm"
                        placeholder="Ex: Pimentão Amarelo"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Unidade</label>
                      <select 
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value as Unit)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all shadow-sm cursor-pointer"
                      >
                        {DEFAULT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Preço Sugerido</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all shadow-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <button className="md:col-span-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.99] uppercase tracking-wider text-xs">
                      <Plus size={18} /> Adicionar ao Portfólio
                    </button>
                  </form>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between px-2">
                      <span>Catálogo Ativo</span>
                      <span>{items.length} Itens</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors shadow-sm group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-500 font-black uppercase group-hover:bg-white transition-colors">{item.unit}</div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                              <p className="text-xs text-emerald-600 font-extrabold">R$ {item.price.toFixed(2)} por {item.unit}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveItem(item.id)} 
                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t font-black text-slate-800 text-xs uppercase tracking-tighter">Limites de Investimento Semanal</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Budget Total (R$)</label>
                      <input 
                        type="number" 
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-emerald-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Cap Diário (R$)</label>
                      <input 
                        type="number" 
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-emerald-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Summary Sidebar */}
          <div className="w-full md:w-80 flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar pr-1">
            <div className={`bg-white border-t-8 rounded-2xl shadow-xl p-6 flex flex-col transition-all ${isOverDaily ? 'border-red-500' : 'border-emerald-500 animate-pulse-subtle'}`}>
              <h3 className="text-slate-500 text-[10px] font-black uppercase mb-5 tracking-[0.2em]">Painel de Simulação</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm text-slate-500 font-medium">
                  <span>Itens Selecionados:</span>
                  <span className="font-bold text-slate-700">{order.length}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 font-medium">
                  <span>Saldo Acumulado:</span>
                  <span className="font-bold text-slate-700 italic">R$ {totalConsumidoSemana.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-slate-100 pt-5 flex flex-col gap-1">
                  <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Investimento do Pedido:</span>
                  <div className="flex justify-between items-baseline">
                    <span className={`text-4xl font-black tracking-tighter ${isOverDaily ? 'text-red-600' : 'text-emerald-700'}`}>
                      R$ {orderTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {isOverDaily && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-[10px] text-red-800 leading-relaxed mb-6 flex gap-3 items-start"
                >
                  <AlertTriangle className="shrink-0 text-red-500" size={16} />
                  <div>
                    <strong className="block mb-1 text-sm">LIMITE EXCEDIDO</strong>
                    Este pedido ultrapassa o Budget Diário em <span className="font-black">R$ {(orderTotal - dailyGoal).toFixed(2)}</span>. Reduza as quantidades para manter a saúde financeira do dia.
                  </div>
                </motion.div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block font-black text-[10px] uppercase text-slate-400 tracking-wider ml-1">Responsável pela Validação</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Identificação do Chef" 
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-0 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
                
                <label className="flex items-start gap-4 cursor-pointer group bg-slate-50/50 p-4 rounded-xl border-2 border-transparent hover:border-slate-100 transition-all">
                  <div className="relative mt-0.5 shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isValidated}
                      onChange={(e) => setIsValidated(e.target.checked)}
                      className="peer h-5 w-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-0 transition-all cursor-pointer opacity-0 absolute z-10"
                    />
                    <div className="h-5 w-5 rounded-lg border-2 border-slate-300 bg-white peer-checked:bg-emerald-600 peer-checked:border-emerald-600 flex items-center justify-center transition-all">
                      {isValidated && <CheckCircle2 className="text-white" size={14} />}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 leading-snug select-none group-hover:text-slate-700 transition-colors uppercase">
                    Declaro que o pedido foi conferido e está em conformidade com as necessidades técnicas da cozinha.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-8">
                <button 
                  onClick={handleFinalizeOrder}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl active:scale-[0.97] border-2
                    ${order.length === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-700 border-emerald-800 text-white hover:bg-emerald-800 shadow-emerald-200 h-16'}`}
                  disabled={order.length === 0}
                >
                  <CheckCircle2 size={20} /> Finalizar & Lançar
                </button>
                <button 
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 bg-white border-2 border-emerald-600 text-emerald-700 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                  disabled={order.length === 0}
                >
                  <MessageSquare size={16} /> Apenas Enviar WhatsApp
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-5 border-2 border-dashed border-emerald-100 flex flex-col gap-2 shadow-inner">
              <div className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center justify-between">
                <span>Status da Base</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-2">
                <Clock size={14} /> Atualizado: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

        </div>
      </main>
      
      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around z-50 px-4 pb-4">
        <button 
          onClick={() => setActiveTab('pedido')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'pedido' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-colors ${activeTab === 'pedido' ? 'bg-emerald-50' : ''}`}>
            <LayoutDashboard size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Pedidos</span>
        </button>
        <button 
          onClick={() => setActiveTab('relatorio')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'relatorio' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-colors ${activeTab === 'relatorio' ? 'bg-emerald-50' : ''}`}>
            <BarChart3 size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Relatórios</span>
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'config' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-emerald-50' : ''}`}>
            <Package size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Admin</span>
        </button>
      </div>

    </div>
  );
}
