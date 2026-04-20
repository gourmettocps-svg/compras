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
  Search,
  User,
  AlertTriangle,
  LayoutDashboard,
  Package,
  FileText,
  Clock,
  RotateCcw,
  PlusCircle,
  Pencil,
  Save,
  X,
  History,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Item, OrderItem, Unit, PastOrder, Category } from './types';

// Constants
const STORAGE_KEY = 'horti_restaurante_v1';
const DEFAULT_UNITS: Unit[] = ['kg', 'un', 'maço', 'cx', 'bandeja'];
const DEFAULT_CATEGORIES: Category[] = ['Custo de Alimentos', 'Embalagens', 'Bebidas'];

// Helper to parse numbers with comma or dot
const parseNum = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const normalized = val.toString().replace(',', '.');
  return parseFloat(normalized) || 0;
};

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'pedido' | 'config'>('pedido');
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(5000);
  const [accumulatedWeekly, setAccumulatedWeekly] = useState<number>(3450);
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<PastOrder[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Admin Modal state
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<Unit>('kg');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Custo de Alimentos');
  const [newItemPrice, setNewItemPrice] = useState<string>('');

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState<Unit>('kg');
  const [editCategory, setEditCategory] = useState<Category>('Custo de Alimentos');
  const [editPrice, setEditPrice] = useState<string>('');

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setItems(data.items || []);
        setOrder(data.order || []);
        setWeeklyGoal(data.weeklyGoal || 5000);
        setAccumulatedWeekly(parseNum(data.accumulatedWeekly) || 0);
        setResponsibleName(data.responsibleName || '');
        setIsValidated(data.isValidated || false);
        setHistory(data.history || []);
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    } else {
      // Sample data
      setItems([
        { id: '1', name: 'Tomate Saladete', unit: 'kg', price: 8.9, category: 'Custo de Alimentos' },
        { id: '2', name: 'Alface Americana', unit: 'maço', price: 3.5, category: 'Custo de Alimentos' },
        { id: '3', name: 'Cebola Branca', unit: 'kg', price: 6.8, category: 'Custo de Alimentos' },
        { id: '4', name: 'Brócolis Ninja', unit: 'un', price: 12.0, category: 'Custo de Alimentos' },
        { id: '5', name: 'Cenoura Especial', unit: 'kg', price: 5.2, category: 'Custo de Alimentos' },
        { id: '6', name: 'Saco Plástico 5kg', unit: 'cx', price: 45.0, category: 'Embalagens' },
        { id: '7', name: 'Água Mineral 500ml', unit: 'un', price: 2.5, category: 'Bebidas' },
      ]);
      setWeeklyGoal(5000);
      setAccumulatedWeekly(0);
      setHistory([]);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    const data = {
      items,
      order,
      weeklyGoal,
      accumulatedWeekly,
      responsibleName,
      isValidated,
      history
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [items, order, weeklyGoal, accumulatedWeekly, responsibleName, isValidated, history]);

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

  // Totals calculations
  const totalHistorico = history.reduce((sum, o) => sum + o.total, 0);
  const totalConsumidoSemana = totalHistorico + accumulatedWeekly;
  const projectedTotalSemana = totalConsumidoSemana + orderTotal;

  const isOverWeekly = projectedTotalSemana > weeklyGoal;
  const weeklyUsagePercent = Math.min((projectedTotalSemana / weeklyGoal) * 100, 100).toFixed(0);

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

  const getWhatsAppMessage = (currentOrder: OrderItem[], person: string, validated: boolean, total: number) => {
    const itemDetails = currentOrder.map(orderItem => {
      const item = items.find(i => i.id === orderItem.itemId);
      const subtotal = (item?.price || 0) * orderItem.quantity;
      return `${item?.name || 'Item'}: ${orderItem.quantity}${item?.unit || ''} - R$ ${subtotal.toFixed(2)}`;
    }).join('\n');

    const metaStatus = total > weeklyGoal ? '*AVISO: Pedido acima da meta semanal!*' : '*Dentro da meta semanal.*';
    
    return `*Pedido de Hortifruti - Simulador Gourmetto*
---------------------------------------
*Responsável:* ${person || 'Não informado'}
*Status:* ${validated ? '✅ Validado' : '❌ Pendente'}

*Itens:*
${itemDetails}

---------------------------------------
*Total do Pedido: R$ ${total.toFixed(2)}*
*Status Financeiro:* ${metaStatus}
---------------------------------------`;
  };

  const handleFinalizeOrder = () => {
    if (order.length === 0) return;

    if (!responsibleName) {
      alert('Por favor, informe o nome do responsável.');
      return;
    }
    if (!isValidated) {
      alert('Por favor, confirme os itens e quantidades validando o pedido (marcar o check abaixo).');
      return;
    }

    // 1. Gerar mensagem do WhatsApp ANTES de limpar os dados
    const message = getWhatsAppMessage(order, responsibleName, isValidated, orderTotal);

    // 2. Criar entrada no histórico
    const details = order.map(oi => {
      const item = items.find(i => i.id === oi.itemId);
      return {
        name: item?.name || 'Item Removido',
        quantity: oi.quantity,
        unit: item?.unit || 'un',
        price: item?.price || 0,
        category: item?.category || 'Custo de Alimentos'
      };
    });

    const newHistoryEntry: PastOrder = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleString('pt-BR'),
      total: orderTotal,
      responsible: responsibleName,
      itemCount: order.length,
      details: details
    };

    // 3. Atualizar estados de forma funcional (garante integridade)
    setHistory(prev => [newHistoryEntry, ...prev]);
    setOrder([]);
    setResponsibleName('');
    setIsValidated(false);

    alert('✅ Pedido finalizado com sucesso e registrado no histórico!');

    // 4. Abrir WhatsApp (pode ser bloqueado por popup blocker, mas os dados já foram salvos)
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const newItem: Item = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      name: newItemName,
      unit: newItemUnit,
      price: parseNum(newItemPrice),
      category: newItemCategory
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleStartEdit = (item: Item) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditUnit(item.unit);
    setEditCategory(item.category);
    setEditPrice(item.price.toString());
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = (id: string) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, name: editName, unit: editUnit, price: parseNum(editPrice), category: editCategory }
        : item
    ));
    setEditingItemId(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    setOrder(order.filter(i => i.itemId !== id));
  };

  const handleSendWhatsApp = () => {
    if (order.length === 0) return;
    const message = getWhatsAppMessage(order, responsibleName, isValidated, orderTotal);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const confirmClearHistory = () => {
    setHistory([]);
    setAccumulatedWeekly(0);
    setShowClearConfirm(false);
    alert('✅ Histórico limpo com sucesso.');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Sidebar - Aside */}
      <aside className="hidden md:flex w-64 bg-emerald-900 text-white flex-col border-r border-emerald-800 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-emerald-800 mb-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xl">S</div>
          <span className="font-bold tracking-tight text-lg leading-tight text-white whitespace-normal">Simulador Gourmetto</span>
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
            onClick={() => setActiveTab('config')}
            className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activeTab === 'config' ? 'bg-emerald-800 shadow-sm' : 'hover:bg-emerald-800/50 text-emerald-100'}`}
          >
            <Package className={`w-5 h-5 ${activeTab === 'config' ? 'opacity-100' : 'opacity-60'}`} />
            <span>Catálogo / Admin</span>
          </div>
        </nav>

        <div className="p-6 border-t border-emerald-800">
          <div className="text-xs text-emerald-400 uppercase font-semibold mb-2">Sistema Gestão</div>
          <div className="text-sm font-medium">Simulador Gourmetto</div>
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
              <div className="text-lg font-bold text-emerald-600">
                R$ {projectedTotalSemana.toFixed(2)}
              </div>
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

                  {DEFAULT_CATEGORIES.map(category => {
                    const categoryItems = filteredItems.filter(i => i.category === category);
                    if (categoryItems.length === 0) return null;

                    return (
                      <div key={category} className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 px-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{category}</h3>
                        </div>
                        
                        {categoryItems.map(item => {
                          const orderItem = order.find(oi => oi.itemId === item.id);
                          const qty = orderItem?.quantity || 0;
                          return (
                            <div 
                              key={item.id} 
                              className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-md ${qty > 0 ? 'border-emerald-300 shadow-sm' : 'border-slate-200'}`}
                            >
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shrink-0 ${qty > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                                {item.category === 'Bebidas' ? '🥤' : item.category === 'Embalagens' ? '📦' : item.name.toLowerCase().includes('tomate') ? '🍅' : item.name.toLowerCase().includes('alface') ? '🥬' : item.name.toLowerCase().includes('cebola') ? '🧅' : item.name.toLowerCase().includes('brócolis') ? '🥦' : item.name.toLowerCase().includes('cenoura') ? '🥕' : '🥝'}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-800">{item.name}</h4>
                                <p className="text-xs text-slate-500 uppercase">{item.unit} • R$ {item.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.id, Math.max(0, qty - (item.unit === 'un' || item.unit === 'cx' || item.unit === 'bandeja' ? 1 : 0.5)))}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="text" 
                                    inputMode="decimal"
                                    value={qty || ''}
                                    onChange={(e) => handleUpdateQuantity(item.id, parseNum(e.target.value))}
                                    placeholder="0"
                                    className="w-12 h-8 text-center font-bold text-slate-700 focus:outline-none text-sm bg-white border-x border-slate-100"
                                  />
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.id, qty + (item.unit === 'un' || item.unit === 'cx' || item.unit === 'bandeja' ? 1 : 0.5))}
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
                      </div>
                    );
                  })}

                  {/* History Section back in bottom of pedido view */}
                  {history.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <History size={16} className="text-emerald-600" />
                          Lançamentos Recentes
                        </h3>
                        <button 
                          onClick={() => setShowClearConfirm(true)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
                        >
                          Limpar Histórico
                        </button>
                      </div>
                      <div className="space-y-3">
                        {history.slice(0, 5).map(order => (
                          <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                <Calendar size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{order.date}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-medium">{order.responsible} • {order.itemCount} itens</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-700">R$ {order.total.toFixed(2)}</p>
                              <span className="text-[10px] font-bold text-emerald-600 uppercase">Processado</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  
                  <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
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
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Categoria</label>
                      <select 
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as Category)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all shadow-sm cursor-pointer"
                      >
                        {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
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
                        type="text" 
                        inputMode="decimal"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all shadow-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <button className="md:col-span-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.99] uppercase tracking-wider text-xs">
                      <Plus size={18} /> Adicionar ao Portfólio
                    </button>
                  </form>

                  <div className="space-y-6">
                    {DEFAULT_CATEGORIES.map(category => {
                      const categoryItems = items.filter(i => i.category === category);
                      if (categoryItems.length === 0) return null;

                      return (
                        <div key={category} className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between px-2">
                            <span>{category}</span>
                            <span>{categoryItems.length} Itens</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {categoryItems.map(item => (
                              <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3.5 hover:bg-slate-50/50 transition-colors shadow-sm group">
                                {editingItemId === item.id ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="Nome"
                                      />
                                      <select 
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value as Category)}
                                        className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                      >
                                        {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                      <select 
                                        value={editUnit}
                                        onChange={(e) => setEditUnit(e.target.value as Unit)}
                                        className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                      >
                                        {DEFAULT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                      <input 
                                        type="text" 
                                        inputMode="decimal"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="Preço"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button 
                                        onClick={handleCancelEdit}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                                      >
                                        <X size={14} /> Cancelar
                                      </button>
                                      <button 
                                        onClick={() => handleSaveEdit(item.id)}
                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all flex items-center gap-1 text-xs font-bold uppercase"
                                      >
                                        <Save size={14} /> Salvar Alterações
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-500 font-black uppercase group-hover:bg-white transition-colors">{item.unit}</div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                        <p className="text-xs text-emerald-600 font-extrabold">R$ {item.price.toFixed(2)} por {item.unit}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => handleStartEdit(item)}
                                        className="p-2.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                        title="Editar item"
                                      >
                                        <Pencil size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleRemoveItem(item.id)} 
                                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Remover item"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-8 border-t font-black text-slate-800 text-xs uppercase tracking-tighter">Limites de Investimento Semanal</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Budget Total (R$)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(parseNum(e.target.value))}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-emerald-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Lançamento Adicional (R$)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={accumulatedWeekly}
                        onChange={(e) => setAccumulatedWeekly(parseNum(e.target.value))}
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
            <div className={`bg-white border-t-8 rounded-2xl shadow-xl p-6 flex flex-col transition-all ${isOverWeekly ? 'border-amber-500' : 'border-emerald-500 animate-pulse-subtle'}`}>
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
                    <span className={`text-4xl font-black tracking-tighter ${isOverWeekly ? 'text-amber-600' : 'text-emerald-700'}`}>
                      R$ {orderTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {isOverWeekly && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-[10px] text-amber-800 leading-relaxed mb-6 flex gap-3 items-start"
                >
                  <AlertTriangle className="shrink-0 text-amber-500" size={16} />
                  <div>
                    <strong className="block mb-1 text-sm">ALERTA DE BUDGET</strong>
                    Este pedido levará o consumo semanal para <span className="font-black">R$ {projectedTotalSemana.toFixed(2)}</span>, ultrapassando a meta definida.
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
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'config' ? 'text-emerald-700' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-emerald-50' : ''}`}>
            <Package size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Admin</span>
        </button>
      </div>

      {/* Confirmation Modal Overlay */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Limpar Histórico?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Tem certeza que deseja apagar todos os lançamentos passados e zerar o saldo acumulado? Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmClearHistory}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all shadow-lg active:scale-[0.98]"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
