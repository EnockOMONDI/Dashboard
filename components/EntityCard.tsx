
import React from 'react';
import { Entity, KnowledgeEntity, JobEntity, TaskEntity, SubscriptionEntity } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface EntityCardProps {
  entity: Entity;
  onDelete?: (id: string) => void;
  onClick?: (entity: Entity) => void;
  isProcessing?: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity, onDelete, onClick, isProcessing }) => {
  const getIcon = () => {
    switch (entity.type) {
      case 'knowledge': 
        if ((entity as KnowledgeEntity).category === 'people') return '👤';
        return '🧠';
      case 'job': return '💼';
      case 'client': return '🤝';
      case 'task': return '⚡';
      case 'subscription': return '💳';
      default: return '📄';
    }
  };

  const isPeople = entity.type === 'knowledge' && (entity as KnowledgeEntity).category === 'people';
  const person = isPeople ? (entity as KnowledgeEntity) : null;
  const isJob = entity.type === 'job';
  const job = isJob ? (entity as JobEntity) : null;
  const isTask = entity.type === 'task';
  const task = isTask ? (entity as TaskEntity) : null;
  const isSub = entity.type === 'subscription';
  const sub = isSub ? (entity as SubscriptionEntity) : null;

  const getDeadlineInfo = () => {
    if (!job?.deadlineDate) return null;
    const today = new Date();
    const deadline = new Date(job.deadlineDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = 'text-slate-400';
    if (diffDays <= 3) color = 'text-red-500 font-bold';
    else if (diffDays <= 10) color = 'text-amber-500 font-bold';

    return { diffDays, color };
  };

  const deadline = getDeadlineInfo();

  return (
    <div 
      onClick={() => onClick?.(entity)}
      className="group bg-white border border-slate-200 p-5 rounded-[1.5rem] hover:border-slate-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
          {getIcon()}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isProcessing && (
            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border shadow-sm bg-blue-600 text-white border-blue-700 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
              Thinking...
            </span>
          )}
          {entity.priority && (
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border shadow-sm ${PRIORITY_COLORS[entity.priority]}`}>
              {entity.priority}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-slate-900 mb-1.5 line-clamp-1 text-base tracking-tight group-hover:text-blue-600 transition-colors">
        {entity.title}
      </h3>
      
      {isJob && job?.aiScoutTags && job.aiScoutTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.aiScoutTags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">#{tag}</span>
          ))}
        </div>
      )}

      {(entity.type === 'knowledge' || entity.type === 'client' || entity.type === 'task') && (
        <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
          {entity.notes ? (
            <div dangerouslySetInnerHTML={{ __html: entity.notes }} className="prose prose-sm max-w-none" />
          ) : (
            (entity as any).summary || (entity as any).industry
          )}
        </div>
      )}

      {isTask && task && (
        <div className="mt-4 flex flex-col gap-3">
          {task.deadlineDate && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Deadline to Beat</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                new Date(task.deadlineDate) < new Date() ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}>
                {new Date(task.deadlineDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
             <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${task.status === 'Done' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></span>
              {task.status}
            </div>
            <button className="text-[10px] text-blue-600 font-black bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest border border-blue-100">
              Launch Deep Work
            </button>
          </div>
        </div>
      )}

      {isJob && job && (
        <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Platform</span>
            <span className="text-[10px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded-lg font-bold">
              {job.company}
            </span>
          </div>
          <div className="flex items-center justify-between">
             <div className="flex items-center">
                {job.hourlyRate ? (
                  <span className="text-sm font-black text-green-600">${job.hourlyRate}<span className="text-[10px] text-slate-400 font-bold">/hr</span></span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">Rate TBD</span>
                )}
             </div>
             {job.platformStatus && (
               <span className={`text-[9px] font-black px-2 py-1 rounded-lg shadow-sm border ${
                 job.platformStatus === 'Active' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-500'
               }`}>
                 {job.platformStatus.toUpperCase()}
               </span>
             )}
          </div>
        </div>
      )}

      {isSub && sub && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
          <span className="text-sm font-black text-slate-900">${sub.cost}<span className="text-[10px] text-slate-400 font-medium">/{sub.billingCycle === 'Monthly' ? 'mo' : 'yr'}</span></span>
          <div className={`w-2 h-2 rounded-full ${sub.keep ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      )}

      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(entity.id); }}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 bg-white shadow-lg text-slate-400 hover:text-red-500 transition-all p-2 rounded-xl border border-slate-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );
};
