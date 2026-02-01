
import React, { useEffect, useState, useMemo } from 'react';
import { Entity, KnowledgeEntity, TaskEntity, JobEntity, SubscriptionEntity } from '../types';
import { getDailyRecommendations } from '../services/geminiService';
import { EntityCard } from '../components/EntityCard';

export const Dashboard: React.FC<{ entities: Entity[] }> = ({ entities }) => {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRecommendation() {
      if (entities.length === 0) return;
      setLoading(true);
      const res = await getDailyRecommendations(entities);
      setRecommendation(res);
      setLoading(false);
    }
    fetchRecommendation();
  }, [entities.length === 0]);

  const stats = useMemo(() => {
    const subs = entities.filter(e => e.type === 'subscription') as SubscriptionEntity[];
    const tasks = entities.filter(e => e.type === 'task') as TaskEntity[];
    const monthlyBurn = subs.reduce((acc, s) => acc + (s.billingCycle === 'Monthly' ? s.cost : s.cost / 12), 0);
    const activeGigs = entities.filter(e => e.type === 'job' && (e as JobEntity).platformStatus === 'Active') as JobEntity[];
    
    // Leverage Score Calculation (Ratio of high priority output to burn)
    const highPriorityTasks = tasks.filter(t => t.priority === 'High' && t.status === 'Done').length;
    const leverageScore = Math.min(100, (highPriorityTasks * 10) + (activeGigs.length * 15));

    return { monthlyBurn, activeGigs, leverageScore };
  }, [entities]);

  const urgentTasks = useMemo(() => 
    entities.filter(e => e.type === 'task' && e.status !== 'Done' && (e.priority === 'High')) as TaskEntity[]
  , [entities]);

  const dailyChecklist = useMemo(() => {
    return [...(recommendation?.focusChecklist || ['Sync high-leverage tools', 'Audit 1 Subscription', 'Update Pipeline Status'])];
  }, [recommendation]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Status</h1>
          <p className="text-slate-500 mt-1 font-medium">Strategic overview for {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Leverage Score</p>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black text-blue-600">{stats.leverageScore}</span>
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${stats.leverageScore}%` }}></div>
                </div>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monthly Burn</p>
              <p className="text-lg font-bold text-slate-900">${stats.monthlyBurn.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recommendation */}
        <section className="lg:col-span-2 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm h-full">
            <div className="flex items-center space-x-2 mb-6">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600">Daily Strategy</h2>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-slate-100 rounded-xl w-3/4"></div>
                <div className="h-4 bg-slate-50 rounded-xl w-1/2"></div>
              </div>
            ) : recommendation ? (
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                  {recommendation.recommendation}
                </h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-xl">
                  {recommendation.rationale}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                  {recommendation.actionItems?.map((item: string, i: number) => (
                    <div key={i} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:border-blue-200 transition-all cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-3 text-xs shadow-sm group-hover/item:border-blue-500 group-hover/item:text-blue-600 font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Add data to generate your daily leverage report.</p>
            )}
          </div>
        </section>

        {/* Sidebar Checklist */}
        <section className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Executive Protocol</h2>
            <div className="text-[10px] bg-slate-800 px-2 py-1 rounded-lg font-mono text-slate-400">v1.2.0</div>
          </div>
          <ul className="space-y-5 flex-1">
            {dailyChecklist.map((item: string, i: number) => (
              <li key={i} className="flex items-start group cursor-pointer">
                <div className={`w-6 h-6 rounded-lg border-2 mt-0.5 mr-4 flex-shrink-0 transition-all flex items-center justify-center ${
                  item.includes('🚨') ? 'border-red-500 bg-red-500/20' : 'border-slate-700 group-hover:border-blue-500'
                }`}>
                  <div className="w-2 h-2 rounded-sm bg-transparent group-hover:bg-blue-500 transition-all"></div>
                </div>
                <span className={`text-sm font-medium leading-tight ${
                  item.includes('🚨') ? 'text-red-300' : 'text-slate-300 group-hover:text-white'
                }`}>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6 border-t border-slate-800">
             <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
               <span>Deep Work Potential</span>
               <span className="text-blue-400">85%</span>
             </div>
             <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 w-[85%]"></div>
             </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Output Pipeline</h2>
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg">High Leverage Only</span>
          </div>
          <div className="space-y-4">
            {urgentTasks.length > 0 || stats.activeGigs.length > 0 ? (
              <>
                {urgentTasks.map(task => <EntityCard key={task.id} entity={task} />)}
                {stats.activeGigs.map(gig => (
                  <div key={gig.id} className="relative">
                    <div className="absolute -left-1 top-4 w-1.5 h-12 bg-green-500 rounded-full z-10 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <EntityCard entity={gig} />
                  </div>
                ))}
              </>
            ) : (
              <div className="p-20 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                 <p className="text-slate-300 text-sm font-medium italic">No active threats to velocity.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-2">
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">System Resonance</h2>
             <button className="text-[10px] font-bold text-blue-600 hover:underline">Explore All Brain Items</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
             {entities.filter(e => e.type === 'knowledge' && e.priority === 'High').slice(0, 3).map(item => (
               <EntityCard key={item.id} entity={item} />
             ))}
             {entities.filter(e => e.type === 'knowledge' && e.priority === 'High').length === 0 && (
               <div className="p-20 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                 <p className="text-slate-300 text-sm font-medium italic">Capture thinking to see resonance.</p>
              </div>
             )}
          </div>
        </section>
      </div>
    </div>
  );
};
