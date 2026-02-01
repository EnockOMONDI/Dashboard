
import React, { useState } from 'react';
import { Entity, SubscriptionEntity } from '../types';
import { EntityCard } from '../components/EntityCard';

export const Subscriptions: React.FC<{ entities: Entity[], onAdd: (e: Entity) => void, onDelete: (id: string) => void }> = ({ entities, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', cost: '', cycle: 'Monthly' as any, why: '' });

  const subscriptions = entities.filter(e => e.type === 'subscription') as SubscriptionEntity[];
  const monthlyTotal = subscriptions.reduce((acc, s) => acc + (s.billingCycle === 'Monthly' ? s.cost : s.cost / 12), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSub: SubscriptionEntity = {
      id: crypto.randomUUID(),
      type: 'subscription',
      title: formData.name,
      cost: parseFloat(formData.cost),
      billingCycle: formData.cycle,
      whyExists: formData.why,
      keep: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onAdd(newSub);
    setIsAdding(false);
    setFormData({ name: '', cost: '', cycle: 'Monthly', why: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500">Manage tool sprawl and financial clarity.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Monthly Cost</p>
          <p className="text-2xl font-bold text-slate-900">${monthlyTotal.toFixed(2)}</p>
        </div>
      </div>

      <button 
        onClick={() => setIsAdding(!isAdding)}
        className="bg-black text-white px-6 py-2.5 rounded-xl font-medium w-full"
      >
        {isAdding ? 'Close' : 'Track New Subscription'}
      </button>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Service Name" className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="flex gap-2">
              <input required type="number" placeholder="Cost" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
              <select className="bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" value={formData.cycle} onChange={e => setFormData({...formData, cycle: e.target.value as any})}>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </div>
          </div>
          <textarea placeholder="Why does this exist?" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm resize-none" value={formData.why} onChange={e => setFormData({...formData, why: e.target.value})} rows={2} />
          <button type="submit" className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold">Add Subscription</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptions.map(sub => (
          <EntityCard key={sub.id} entity={sub} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};
