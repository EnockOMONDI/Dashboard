
import React, { useState } from 'react';
import { Entity, KnowledgeEntity, KnowledgeCategory, SocialPlatform } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../constants';
import { EntityCard } from '../components/EntityCard';

const PLATFORMS: SocialPlatform[] = ['YouTube', 'Twitter/X', 'Skool', 'GitHub', 'Other'];

export const KnowledgeBrain: React.FC<{ 
  entities: Entity[], 
  onAdd: (e: Entity) => void, 
  onDelete: (id: string) => void,
  onUpdate: (e: Entity) => void
}> = ({ entities, onAdd, onDelete, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory>('ai-code');
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    promptResponse: '',
    priority: 'Medium' as any,
    platform: 'YouTube' as SocialPlatform,
    handleOrChannel: '',
    contentLink: ''
  });

  const knowledgeItems = entities.filter(e => e.type === 'knowledge') as KnowledgeEntity[];
  const selectedCatInfo = KNOWLEDGE_CATEGORIES.find(c => c.id === activeCategory)!;

  const handleEdit = (item: Entity) => {
    const k = item as KnowledgeEntity;
    setEditingId(k.id);
    setActiveCategory(k.category);
    setFormData({
      title: k.title,
      summary: k.summary,
      promptResponse: k.promptResponse,
      priority: k.priority || 'Medium',
      platform: k.platform || 'YouTube',
      handleOrChannel: k.handleOrChannel || '',
      contentLink: k.contentLink || ''
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commonData = {
      title: formData.title,
      summary: formData.summary,
      promptResponse: formData.promptResponse,
      priority: formData.priority,
      category: activeCategory,
      updatedAt: new Date().toISOString(),
      ...(activeCategory === 'people' ? {
        platform: formData.platform,
        handleOrChannel: formData.handleOrChannel,
        contentLink: formData.contentLink
      } : {})
    };

    if (editingId) {
      const existing = knowledgeItems.find(i => i.id === editingId)!;
      onUpdate({ ...existing, ...commonData });
    } else {
      const newEntity: KnowledgeEntity = {
        id: crypto.randomUUID(),
        type: 'knowledge',
        createdAt: new Date().toISOString(),
        ...commonData
      } as KnowledgeEntity;
      onAdd(newEntity);
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({ title: '', summary: '', promptResponse: '', priority: 'Medium', platform: 'YouTube', handleOrChannel: '', contentLink: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{editingId ? 'Edit Knowledge' : 'Knowledge Brain'}</h1>
          <p className="text-slate-500">Structured capture of tools, ideas, and resources.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) setEditingId(null);
          }}
          className="bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center"
        >
          {isAdding ? 'Close' : 'Capture Thinking'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {KNOWLEDGE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                    activeCategory === cat.id ? 'border-black bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-center leading-none">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {activeCategory === 'people' && (
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Platform</label>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({...formData, platform: p})}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              formData.platform === p ? 'bg-black text-white' : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <input 
                        value={formData.handleOrChannel}
                        onChange={e => setFormData({...formData, handleOrChannel: e.target.value})}
                        placeholder="Handle / Channel Name"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none"
                      />
                      <input 
                        value={formData.contentLink}
                        onChange={e => setFormData({...formData, contentLink: e.target.value})}
                        placeholder="URL Link"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  </div>
                )}

                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Title"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none transition-all"
                />
                <textarea 
                  required
                  value={formData.summary}
                  onChange={e => setFormData({...formData, summary: e.target.value})}
                  rows={3}
                  placeholder="What makes this special?"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">ThinkStack Prompt: {selectedCatInfo.prompt}</label>
                  <textarea 
                    required
                    value={formData.promptResponse}
                    onChange={e => setFormData({...formData, promptResponse: e.target.value})}
                    rows={5}
                    placeholder="Connect this to your leverage..."
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none transition-all resize-none shadow-inner"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value as any})}
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                    {editingId ? 'Update Item' : 'Save to Brain'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {knowledgeItems.length > 0 ? (
          knowledgeItems.map(item => (
            <EntityCard key={item.id} entity={item} onDelete={onDelete} onClick={handleEdit} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-sm">Knowledge base is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};
