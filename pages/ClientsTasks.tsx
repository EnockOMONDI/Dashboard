
import React, { useState, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import DatePicker from 'react-datepicker';
import { Entity, ClientEntity, TaskEntity, KnowledgeEntity, Subtask, TaskStatus } from '../types';
import { EntityCard } from '../components/EntityCard';
import { PRIORITY_COLORS } from '../constants';
import { generateTaskStrategy } from '../services/geminiService';

export const ClientsTasks: React.FC<{ 
  entities: Entity[], 
  onAdd: (e: Entity) => void, 
  onDelete: (id: string) => void,
  onUpdate: (e: Entity) => void,
  processingTasks: Set<string>
}> = ({ entities, onAdd, onDelete, onUpdate, processingTasks }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'clients'>('tasks');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isStrategizing, setIsStrategizing] = useState(false);
  const [suggestedTools, setSuggestedTools] = useState<{name: string, type: 'existing' | 'new', description: string}[]>([]);
  
  const clients = entities.filter(e => e.type === 'client') as ClientEntity[];
  const tasks = entities.filter(e => e.type === 'task') as TaskEntity[];
  const knowledge = entities.filter(e => e.type === 'knowledge') as KnowledgeEntity[];

  const [clientForm, setClientForm] = useState({ title: '', industry: '', priority: 'Medium' as any });
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    clientId: '', 
    priority: 'Medium' as any, 
    deadlineDate: '',
    notes: '',
    relatedIds: [] as string[],
    subtasks: [] as Subtask[],
    strategicObjective: '',
    successMetric: '',
    toolIds: [] as string[]
  });

  const filteredTasks = useMemo(() => {
    if (!selectedClientId) return tasks;
    return tasks.filter(t => t.clientId === selectedClientId);
  }, [tasks, selectedClientId]);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), 
  [clients, selectedClientId]);

  const handleEditTask = (task: TaskEntity) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      clientId: task.clientId || '',
      priority: task.priority || 'Medium',
      deadlineDate: task.deadlineDate || '',
      notes: task.notes || '',
      relatedIds: task.relatedIds || [],
      subtasks: task.subtasks || [],
      strategicObjective: task.strategicObjective || '',
      successMetric: task.successMetric || '',
      toolIds: task.toolIds || []
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAIStrategist = async () => {
    if (!taskForm.title) return;
    setIsStrategizing(true);
    try {
      const existingToolNames = knowledge.map(k => k.title);
      const strategy = await generateTaskStrategy(taskForm.title, taskForm.notes, existingToolNames);
      
      if (strategy) {
        console.log("AI Strategy received:", strategy);
        
        // Ensure subtasks have IDs for React keys and status toggling
        const subtasksWithIds = (strategy.subtasks || []).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          title: s.title || '',
          status: s.status || 'Todo'
        }));

        setTaskForm(prev => ({
          ...prev,
          title: strategy.refinedTitle || prev.title,
          strategicObjective: strategy.strategicObjective || '',
          successMetric: strategy.successMetric || '',
          notes: strategy.expandedNotes ? `${prev.notes}<br/>${strategy.expandedNotes}` : prev.notes,
          subtasks: subtasksWithIds
        }));
        setSuggestedTools(strategy.suggestedTools || []);
      }
    } catch (error) {
      console.error("AI Strategist failed:", error);
    } finally {
      setIsStrategizing(false);
    }
  };

  const toggleSubtaskStatus = (subtaskId: string) => {
    const updatedSubtasks = taskForm.subtasks.map(s => {
      if (s.id === subtaskId) {
        const nextStatus: TaskStatus = s.status === 'Todo' ? 'In Progress' : s.status === 'In Progress' ? 'Done' : 'Todo';
        return { ...s, status: nextStatus };
      }
      return s;
    });

    setTaskForm(prev => ({ ...prev, subtasks: updatedSubtasks }));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine overall task status based on subtasks
    let overallStatus: TaskStatus = 'Todo';
    if (taskForm.subtasks.some(s => s.status === 'In Progress')) {
      overallStatus = 'In Progress';
    } else if (taskForm.subtasks.length > 0 && taskForm.subtasks.every(s => s.status === 'Done')) {
      overallStatus = 'Done';
    }

    const commonData = {
      title: taskForm.title,
      clientId: taskForm.clientId || undefined,
      priority: taskForm.priority,
      deadlineDate: taskForm.deadlineDate,
      notes: taskForm.notes,
      relatedIds: taskForm.relatedIds,
      subtasks: taskForm.subtasks,
      strategicObjective: taskForm.strategicObjective,
      successMetric: taskForm.successMetric,
      toolIds: taskForm.toolIds,
      status: overallStatus,
      updatedAt: new Date().toISOString()
    };

    if (editingTaskId) {
      const existing = tasks.find(t => t.id === editingTaskId);
      if (existing) {
        onUpdate({ ...existing, ...commonData } as TaskEntity);
      }
    } else {
      const newTask: TaskEntity = {
        id: crypto.randomUUID(),
        uid: '',
        type: 'task',
        createdAt: new Date().toISOString(),
        ...commonData
      } as TaskEntity;
      onAdd(newTask);
    }

    setIsAdding(false);
    setEditingTaskId(null);
    setTaskForm({ 
      title: '', 
      clientId: '', 
      priority: 'Medium', 
      deadlineDate: '', 
      notes: '', 
      relatedIds: [],
      subtasks: [],
      strategicObjective: '',
      successMetric: '',
      toolIds: []
    });
    setSuggestedTools([]);
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: ClientEntity = {
      id: crypto.randomUUID(),
      uid: '',
      type: 'client',
      title: clientForm.title,
      industry: clientForm.industry,
      status: 'Active',
      priority: clientForm.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onAdd(newClient);
    setIsAdding(false);
    setClientForm({ title: '', industry: '', priority: 'Medium' });
  };

  const handleClientClick = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab('tasks');
  };

  // Helper to format date with ordinals (e.g., January 25th 2026)
  const formatDateWithOrdinal = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `added on ${month} ${getOrdinal(day)} ${year}`;
  };

  // Helper to determine task card styling based on completion and age
  const getTaskStyles = (task: TaskEntity) => {
    if (task.status === 'Done') {
      return 'bg-green-50 border-green-200 hover:border-green-400';
    }
    
    const createdDate = new Date(task.createdAt).getTime();
    const now = new Date().getTime();
    const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 5) {
      return 'bg-red-50 border-red-200 hover:border-red-400';
    }
    if (diffDays > 2) {
      return 'bg-amber-50 border-amber-200 hover:border-amber-400';
    }
    
    return 'bg-white border-slate-200 hover:border-blue-400';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'tasks' ? 'Execution Engine' : 'Client Roster'}
          </h1>
          <p className="text-slate-500">
            {activeTab === 'tasks' ? 'High-velocity task list with strategic context.' : 'Strategic network of high-leverage partners.'}
          </p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) setEditingTaskId(null);
          }}
          className="bg-black text-white px-6 py-2.5 rounded-xl font-medium transition-all hover:bg-slate-800 flex items-center gap-2"
        >
          {isAdding ? (
            <><span>✕</span><span>Cancel</span></>
          ) : (
            <><span>＋</span><span>{activeTab === 'tasks' ? 'Capture Task' : 'Register Client'}</span></>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => { setActiveTab('tasks'); setIsAdding(false); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tasks' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Tasks</button>
          <button onClick={() => { setActiveTab('clients'); setIsAdding(false); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Clients</button>
        </div>

        {activeTab === 'tasks' && selectedClientId && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Filtered: {selectedClient?.title}</span>
            <button 
              onClick={() => setSelectedClientId(null)}
              className="text-blue-600 hover:text-blue-800 text-xs font-black p-0.5"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border-t-4 border-t-blue-600">
          {activeTab === 'tasks' ? (
            <form onSubmit={handleAddTask} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Task Definition</label>
                    <div className="flex gap-2">
                      <input 
                        required 
                        placeholder="What needs to be done?" 
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        value={taskForm.title} 
                        onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                      />
                      <button
                        type="button"
                        onClick={handleAIStrategist}
                        disabled={isStrategizing || !taskForm.title}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
                          isStrategizing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                        }`}
                      >
                        {isStrategizing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Strategizing...
                          </>
                        ) : (
                          <>✨ AI Strategist</>
                        )}
                      </button>
                    </div>
                  </div>

                  {taskForm.strategicObjective && (
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl space-y-2">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Strategic Objective</h4>
                      <p className="text-sm text-slate-700 leading-relaxed italic">"{taskForm.strategicObjective}"</p>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes & Context</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                      <ReactQuill 
                        theme="snow" 
                        placeholder="Add strategic nuances or sub-tasks..." 
                        value={taskForm.notes} 
                        onChange={val => setTaskForm({...taskForm, notes: val})}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Execution Roadmap (Subtasks)</label>
                    <div className="space-y-2">
                      {taskForm.subtasks.map((sub, idx) => (
                        <div key={sub.id || idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                          <button
                            type="button"
                            onClick={() => toggleSubtaskStatus(sub.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              sub.status === 'Done' ? 'bg-green-500 border-green-500 text-white' : 
                              sub.status === 'In Progress' ? 'bg-blue-500 border-blue-500 text-white' : 
                              'border-slate-300 bg-white'
                            }`}
                          >
                            {sub.status === 'Done' && '✓'}
                            {sub.status === 'In Progress' && '⋯'}
                          </button>
                          <input
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700"
                            value={sub.title}
                            onChange={(e) => {
                              const updated = [...taskForm.subtasks];
                              updated[idx].title = e.target.value;
                              setTaskForm({...taskForm, subtasks: updated});
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = taskForm.subtasks.filter((_, i) => i !== idx);
                              setTaskForm({...taskForm, subtasks: updated});
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTaskForm({...taskForm, subtasks: [...taskForm.subtasks, { id: crypto.randomUUID(), title: '', status: 'Todo' }]})}
                        className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-blue-400 hover:text-blue-500 transition-all"
                      >
                        ＋ Add Step
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {suggestedTools.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">AI Suggested Toolbox</label>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedTools.map((tool, idx) => {
                          const isAlreadyInBrain = knowledge.find(k => k.title.toLowerCase() === tool.name.toLowerCase());
                          const isSelected = taskForm.toolIds.includes(isAlreadyInBrain?.id || '') || taskForm.relatedIds.includes(isAlreadyInBrain?.id || '');
                          
                          return (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                  {tool.name}
                                  {tool.type === 'new' && !isAlreadyInBrain && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">New</span>}
                                </h5>
                                <p className="text-[10px] text-slate-500 line-clamp-1">{tool.description}</p>
                              </div>
                              {isAlreadyInBrain ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ids = taskForm.relatedIds.includes(isAlreadyInBrain.id) 
                                      ? taskForm.relatedIds.filter(id => id !== isAlreadyInBrain.id)
                                      : [...taskForm.relatedIds, isAlreadyInBrain.id];
                                    setTaskForm({...taskForm, relatedIds: ids});
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                    taskForm.relatedIds.includes(isAlreadyInBrain.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  {taskForm.relatedIds.includes(isAlreadyInBrain.id) ? 'Linked' : 'Link'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTool: KnowledgeEntity = {
                                      id: crypto.randomUUID(),
                                      uid: '',
                                      type: 'knowledge',
                                      title: tool.name,
                                      category: 'ai-code',
                                      summary: tool.description,
                                      promptResponse: `AI suggested tool for task: ${taskForm.title}`,
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    };
                                    onAdd(newTool);
                                    setTaskForm(prev => ({...prev, relatedIds: [...prev.relatedIds, newTool.id]}));
                                  }}
                                  className="px-3 py-1 bg-white text-blue-600 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-50 transition-all"
                                >
                                  ✨ Add to Brain
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Association</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={taskForm.clientId} onChange={e => setTaskForm({...taskForm, clientId: e.target.value})}>
                        <option value="">Internal / No Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Strategic Priority</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Deadline to Beat</label>
                    <div className="w-full">
                      <DatePicker
                        selected={taskForm.deadlineDate ? new Date(taskForm.deadlineDate) : null}
                        onChange={(date: Date | null) => setTaskForm({...taskForm, deadlineDate: date ? date.toISOString() : ''})}
                        placeholderText="Select a deadline..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        dateFormat="MMMM d, yyyy"
                        isClearable
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Map Relevant Brain Items</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {knowledge.map(k => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            const ids = taskForm.relatedIds.includes(k.id) 
                              ? taskForm.relatedIds.filter(id => id !== k.id)
                              : [...taskForm.relatedIds, k.id];
                            setTaskForm({...taskForm, relatedIds: ids});
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border shadow-sm ${
                            taskForm.relatedIds.includes(k.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          {k.title}
                        </button>
                      ))}
                      {knowledge.length === 0 && <p className="text-[10px] text-slate-400 italic">No knowledge base items to link.</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              <button type="submit" className="bg-blue-600 text-white w-full py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">
                {editingTaskId ? 'Sync Execution Changes' : 'Commit Task to OS'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddClient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Partner / Project Identity</label>
                  <input required placeholder="Acme Corp" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={clientForm.title} onChange={e => setClientForm({...clientForm, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Industry Vertical</label>
                  <input required placeholder="SaaS, FinTech, Web3..." className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lifetime Value Priority</label>
                <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={clientForm.priority} onChange={e => setClientForm({...clientForm, priority: e.target.value as any})}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <button type="submit" className="bg-blue-600 text-white w-full py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">Add to Strategic Roster</button>
            </form>
          )}
        </div>
      )}

      <div className="min-h-[400px]">
        {activeTab === 'tasks' ? (
          <div className="space-y-3">
            {filteredTasks.length > 0 ? filteredTasks.map(task => {
              const client = clients.find(c => c.id === task.clientId);
              return (
                <div 
                  key={task.id} 
                  onClick={() => handleEditTask(task)}
                  className={`group border p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between ${getTaskStyles(task)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${task.status === 'Done' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : task.status === 'In Progress' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.3)]'}`}></div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                        {processingTasks.has(task.id) && (
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                            <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                            Thinking...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {client && <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{client.title}</span>}
                        {client && <span className="w-1 h-1 bg-slate-200 rounded-full"></span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${PRIORITY_COLORS[task.priority || 'Medium']}`}>
                          {task.priority}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                          task.status === 'Done' ? 'bg-green-100 text-green-700 border-green-200' : 
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {task.status}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="ml-1 opacity-60">
                              ({task.subtasks.filter(s => s.status === 'Done').length}/{task.subtasks.length})
                            </span>
                          )}
                        </span>
                        {task.deadlineDate && (
                          <>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                              Deadline: {new Date(task.deadlineDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatDateWithOrdinal(task.createdAt)}
                        </span>
                      </div>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.subtasks.slice(0, 3).map(sub => (
                            <div key={sub.id} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              <div className={`w-1.5 h-1.5 rounded-full ${sub.status === 'Done' ? 'bg-green-500' : sub.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                              <span className={`text-[9px] font-bold ${sub.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{sub.title}</span>
                            </div>
                          ))}
                          {task.subtasks.length > 3 && (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter flex items-center">+{task.subtasks.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {task.relatedIds && task.relatedIds.length > 0 && (
                      <div className="hidden md:flex gap-1">
                        {task.relatedIds.slice(0, 2).map(rid => {
                          const k = entities.find(e => e.id === rid);
                          return k ? <span key={rid} className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase">@{k.title}</span> : null;
                        })}
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="py-32 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                <div className="text-4xl mb-4 opacity-20">🎯</div>
                <p className="text-sm font-medium italic">No tasks matched your context. Ready for deep work?</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.length > 0 ? clients.map(client => (
              <div key={client.id} className="relative group">
                <EntityCard 
                  entity={client} 
                  onDelete={onDelete} 
                  onClick={() => handleClientClick(client.id)}
                  isProcessing={processingTasks.has(client.id)}
                />
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                  <span className="text-[10px] bg-black text-white px-3 py-1.5 rounded-xl font-bold uppercase tracking-widest shadow-xl pointer-events-none">
                    View Tasks
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-32 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                 <div className="text-4xl mb-4 opacity-20">🤝</div>
                <p className="text-sm font-medium italic">Your roster is currently empty. Expand your network.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
