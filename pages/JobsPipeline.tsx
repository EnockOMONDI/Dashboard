
import React, { useState } from 'react';
import { Entity, JobEntity, JobStatus, JobCategory, GigPlatformStatus } from '../types';
import { JOB_STATUSES } from '../constants';
import { EntityCard } from '../components/EntityCard';
import { scoutJobDetails } from '../services/geminiService';

const GIG_STATUSES: GigPlatformStatus[] = ["Scouting", "Assessing", "Waitlisted", "Active"];

export const JobsPipeline: React.FC<{ 
  entities: Entity[], 
  onAdd: (e: Entity) => void, 
  onDelete: (id: string) => void,
  processingTasks: Set<string>
}> = ({ entities, onAdd, onDelete, processingTasks }) => {
  const [activeTab, setActiveTab] = useState<JobCategory>('Discovery');
  const [activeGigStatus, setActiveGigStatus] = useState<GigPlatformStatus>('Scouting');
  const [isAdding, setIsAdding] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    jobLink: '',
    status: 'Apply' as JobStatus,
    platformStatus: 'Scouting' as GigPlatformStatus,
    priority: 'Medium' as any,
    payRange: '',
    hourlyRate: '',
    confidenceScore: 3,
    deadlineDate: '',
    aiScoutTags: [] as string[]
  });

  const jobs = entities.filter(e => e.type === 'job') as JobEntity[];
  const discoveryJobs = jobs.filter(j => j.jobCategory === 'Discovery');
  const pipelineJobs = jobs.filter(j => j.jobCategory === 'Pipeline');

  const handleScout = async () => {
    if (!formData.jobLink) return;
    setIsScouting(true);
    const details = await scoutJobDetails(formData.jobLink);
    if (details) {
      setFormData(prev => ({
        ...prev,
        role: details.role || prev.role,
        company: details.company || prev.company,
        payRange: details.payRange || prev.payRange,
        confidenceScore: details.confidence || 3,
        aiScoutTags: details.tags || []
      }));
    }
    setIsScouting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobEntity = {
      id: crypto.randomUUID(),
      uid: '',
      type: 'job',
      jobCategory: activeTab,
      title: `${formData.role} at ${formData.company}`,
      company: formData.company,
      role: formData.role,
      jobLink: formData.jobLink,
      status: activeTab === 'Discovery' ? (formData.platformStatus === 'Active' ? 'Active-Gig' : 'Apply') : formData.status,
      platformStatus: activeTab === 'Discovery' ? formData.platformStatus : undefined,
      priority: formData.priority,
      payRange: formData.payRange,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      confidenceScore: formData.confidenceScore,
      deadlineDate: formData.deadlineDate || undefined,
      aiScoutTags: formData.aiScoutTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onAdd(newJob);
    setIsAdding(false);
    // Auto-switch to the status tab we just added if in discovery
    if (activeTab === 'Discovery') setActiveGigStatus(formData.platformStatus);
    
    setFormData({ company: '', role: '', jobLink: '', status: 'Apply', platformStatus: 'Scouting', priority: 'Medium', payRange: '', hourlyRate: '', confidenceScore: 3, deadlineDate: '', aiScoutTags: [] });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Opportunities</h1>
          <p className="text-slate-500">Hunter-mode for gigs, AI training, and career roles.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-sm flex items-center space-x-2"
        >
          <span>{isAdding ? '✕' : '＋'}</span>
          <span>{isAdding ? 'Close' : activeTab === 'Discovery' ? 'Capture Discovery' : 'Track Application'}</span>
        </button>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Main Category Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
          <button 
            onClick={() => {setActiveTab('Discovery'); setIsAdding(false);}}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'Discovery' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Remote Discovery (Gigs/Digital)
          </button>
          <button 
            onClick={() => {setActiveTab('Pipeline'); setIsAdding(false);}}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'Pipeline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Traditional Pipeline
          </button>
        </div>

        {/* Discovery Sub-Tabs (Gig Stages) */}
        {activeTab === 'Discovery' && (
          <div className="flex items-center space-x-4 border-b border-slate-200">
            {GIG_STATUSES.map(status => (
              <button
                key={status}
                onClick={() => setActiveGigStatus(status)}
                className={`pb-3 text-sm font-bold transition-all relative px-2 ${
                  activeGigStatus === status ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {status}
                <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                  {discoveryJobs.filter(j => j.platformStatus === status).length}
                </span>
                {activeGigStatus === status && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-4 border-t-4 border-t-blue-500 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col space-y-1 mb-4">
            <h3 className="text-lg font-bold text-slate-900">Intelligence Capture</h3>
            <p className="text-xs text-slate-400">Initialize a new opportunity with Gemini intelligence.</p>
          </div>

          <div className="flex space-x-2">
            <input 
              required
              placeholder="Paste Platform URL (Outlier, DataAnnotation, LinkedIn...)"
              value={formData.jobLink}
              onChange={e => setFormData({...formData, jobLink: e.target.value})}
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button 
              type="button"
              onClick={handleScout}
              disabled={isScouting}
              className="bg-blue-50 text-blue-700 px-6 py-3 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50 border border-blue-100"
            >
              {isScouting ? 'SCOUTING...' : 'AI SCOUT'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company / Platform</label>
              <input 
                required
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Role / Project</label>
              <input 
                required
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Budget Range</label>
                <input 
                  placeholder="e.g. $2k - $5k"
                  value={formData.payRange}
                  onChange={e => setFormData({...formData, payRange: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rate $/hr</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={formData.hourlyRate}
                  onChange={e => setFormData({...formData, hourlyRate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                <select 
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value as any})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Initial Status</label>
                {activeTab === 'Discovery' ? (
                   <select 
                    value={formData.platformStatus}
                    onChange={e => setFormData({...formData, platformStatus: e.target.value as GigPlatformStatus})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600 appearance-none"
                  >
                    {GIG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as JobStatus})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
          
          {formData.aiScoutTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-500 uppercase mr-2 mt-1">Intelligence:</span>
              {formData.aiScoutTags.map(tag => (
                <span key={tag} className="text-[10px] bg-white text-blue-700 px-2.5 py-1 rounded-lg font-bold border border-blue-200 shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button type="submit" className="bg-blue-600 text-white w-full py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-2">
            {activeTab === 'Discovery' ? 'Add to Discovery Engine' : 'Initialize Application'}
          </button>
        </form>
      )}

      <div className="min-h-[400px]">
        {activeTab === 'Discovery' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoveryJobs.filter(j => j.platformStatus === activeGigStatus).length > 0 ? (
              discoveryJobs.filter(j => j.platformStatus === activeGigStatus).map(job => (
                <div key={job.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <EntityCard entity={job} onDelete={onDelete} isProcessing={processingTasks.has(job.id)} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem]">
                <div className="text-4xl mb-4 opacity-20">🔎</div>
                <p className="text-sm font-medium">No items found in {activeGigStatus}</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-600 underline"
                >
                  Start scouting new gigs
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {JOB_STATUSES.map(status => (
              <div key={status} className="min-w-[240px] space-y-4">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{status}</h3>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-md font-mono">
                    {pipelineJobs.filter(j => j.status === status).length}
                  </span>
                </div>
                <div className="space-y-4">
                  {pipelineJobs.filter(j => j.status === status).map(job => (
                    <div key={job.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <EntityCard entity={job} onDelete={onDelete} isProcessing={processingTasks.has(job.id)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
