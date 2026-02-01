
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Entity } from './types';
import { storage } from './services/storage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { KnowledgeBrain } from './pages/KnowledgeBrain';
import { JobsPipeline } from './pages/JobsPipeline';
import { ClientsTasks } from './pages/ClientsTasks';
import { Subscriptions } from './pages/Subscriptions';

// Global declaration for AI Studio environment
declare global {
  var aistudio: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

const AuthGate: React.FC<{ onAuthenticated: () => void }> = ({ onAuthenticated }) => {
  const handleAuth = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success to handle the race condition in the environment
      onAuthenticated();
    } catch (error) {
      console.error("Authentication gate error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-[2.5rem] p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="space-y-2">
          <div className="w-20 h-20 bg-black rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6 text-4xl shadow-blue-500/20">🧠</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ThinkStack<span className="text-blue-600">.</span></h1>
          <p className="text-slate-500 font-medium leading-relaxed">Your Strategic OS is ready. Authenticate to access your persistent data vault.</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={handleAuth}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-slate-800 transition-all shadow-lg active:scale-95 group"
          >
            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Log in with Google</span>
          </button>
          <p className="text-[10px] text-slate-400 font-medium italic">Data is stored securely in your browser's local vault.</p>
        </div>

        <div className="pt-8 border-t border-slate-100 flex justify-center space-x-8 opacity-50">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Persistence</p>
            <p className="text-xs font-bold text-slate-600">Local-First</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic</p>
            <p className="text-xs font-bold text-slate-600">Gemini 3</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsAuthenticated(hasKey);
    };
    checkAuth();
  }, []);

  // When authenticated, we re-hydrate the state from storage
  useEffect(() => {
    if (isAuthenticated) {
      const data = storage.loadEntities();
      setEntities(data);
    }
  }, [isAuthenticated]);

  // Sync internal storage whenever entities change
  useEffect(() => {
    if (isAuthenticated) {
      storage.saveEntities(entities);
    }
  }, [entities, isAuthenticated]);

  const addEntity = (entity: Entity) => setEntities(prev => [entity, ...prev]);
  
  const deleteEntity = (id: string) => setEntities(prev => prev.filter(e => e.id !== id));
  
  const updateEntity = (entity: Entity) => {
    setEntities(prev => prev.map(e => 
      e.id === entity.id 
        ? { ...entity, updatedAt: new Date().toISOString() } 
        : e
    ));
  };

  const handleLogout = () => {
    // Note: We don't clear storage on logout anymore so data persists for next login
    setEntities([]);
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] animate-pulse">
        Initializing OS...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard entities={entities} />} />
          <Route path="/brain" element={<KnowledgeBrain entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} />} />
          <Route path="/jobs" element={<JobsPipeline entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} />} />
          <Route path="/clients" element={<ClientsTasks entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} />} />
          <Route path="/subscriptions" element={<Subscriptions entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
