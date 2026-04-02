
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Entity } from './types';
import { storage } from './services/storage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { KnowledgeBrain } from './pages/KnowledgeBrain';
import { JobsPipeline } from './pages/JobsPipeline';
import { ClientsTasks } from './pages/ClientsTasks';
import { Subscriptions } from './pages/Subscriptions';
import { DeveloperPortal } from './pages/DeveloperPortal';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, query, collection, where, orderBy, onSnapshot, db, doc, setDoc, getDocs, deleteDoc, handleFirestoreError, OperationType, addDoc } from './firebase';
import { generateTaskStrategy } from './services/geminiService';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          errorMessage = `Database Error: ${parsedError.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-100 shadow-2xl rounded-3xl p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900">Application Error</h1>
            <p className="text-slate-500">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AuthGate: React.FC = () => {
  const handleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Authentication error:", error);
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
          <p className="text-[10px] text-slate-400 font-medium italic">Data is stored securely in your Firebase vault.</p>
        </div>

        <div className="pt-8 border-t border-slate-100 flex justify-center space-x-8 opacity-50">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Persistence</p>
            <p className="text-xs font-bold text-slate-600">Firebase</p>
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
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());
  
  const hasLoadedFromStorage = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);
      
      if (user) {
        // Sync user profile to Firestore for server-side lookup
        try {
          const userRef = doc(db, 'users', user.uid);
          const emailToSync = user.email?.toLowerCase().trim();
          console.log("Syncing user profile for email:", emailToSync);
          await setDoc(userRef, {
            uid: user.uid,
            email: emailToSync,
            displayName: user.displayName,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("User profile synced to vault.");
          
          // Sweep public inbox for this user
          try {
            const inboxQuery = query(
              collection(db, 'public_inbox'),
              where('userEmail', '==', user.email?.toLowerCase())
            );
            const inboxSnap = await getDocs(inboxQuery);
            if (!inboxSnap.empty) {
              console.log(`Found ${inboxSnap.docs.length} items in public inbox. Sweeping...`);
              for (const inboxDoc of inboxSnap.docs) {
                const data = inboxDoc.data();
                await setDoc(doc(db, 'entities', inboxDoc.id), {
                  ...data,
                  uid: user.uid
                });
                await deleteDoc(inboxDoc.ref);
              }
              console.log("Inbox sweep completed.");
            }
          } catch (sweepError) {
            console.warn("Inbox sweep failed (this is normal if no items exist):", sweepError);
          }
        } catch (error) {
          console.error("User profile sync error:", error);
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady && user) {
      console.log("Auth confirmed, establishing real-time link to vault...");
      
      const q = query(
        collection(db, 'entities'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Entity);
        console.log(`Vault sync: ${data.length} items active.`);
        setEntities(data);
        hasLoadedFromStorage.current = true;
      }, (error) => {
        console.error("Firestore Sync Error:", error);
        handleFirestoreError(error, OperationType.LIST, 'entities');
      });

      return () => unsubscribe();
    }
  }, [isAuthReady, user]);

  // Background AI Strategist
  useEffect(() => {
    const runStrategist = async () => {
      if (!user || entities.length === 0) return;

      // Find tasks that need strategy
      const rawTasks = entities.filter(e => 
        e.type === 'task' && 
        !e.strategicObjective && 
        !processingTasks.has(e.id)
      );

      if (rawTasks.length === 0) return;

      // Process the most recent raw task
      const task = rawTasks[0];
      setProcessingTasks(prev => new Set(prev).add(task.id));

      console.log(`AI Strategist: Processing raw task "${task.title}"...`);

      try {
        // Log start of attempt
        const logRef = await addDoc(collection(db, 'ai_logs'), {
          uid: user.uid,
          action: 'Strategy Generation',
          targetTitle: task.title,
          status: 'processing',
          timestamp: new Date().toISOString()
        });

        // Get relevant brain items (knowledge entities)
        const knowledgeItems = entities
          .filter(e => e.type === 'knowledge')
          .map(e => e.title);

        const strategy = await generateTaskStrategy(task.title, task.notes || '', knowledgeItems);

        if (strategy) {
          const updatedTask = {
            ...task,
            title: strategy.refinedTitle || task.title,
            strategicObjective: strategy.strategicObjective,
            successMetric: strategy.successMetric,
            notes: strategy.expandedNotes || task.notes,
            subtasks: strategy.subtasks,
            updatedAt: new Date().toISOString()
          };

          await storage.updateEntity(updatedTask);
          
          // Update log to success
          await setDoc(logRef, { 
            status: 'success', 
            message: 'Task enhanced successfully.' 
          }, { merge: true });

          console.log(`AI Strategist: Task "${task.title}" enhanced successfully.`);
        } else {
          // Update log to failed if no strategy returned
          await setDoc(logRef, { 
            status: 'failed', 
            message: 'No strategy generated by AI.' 
          }, { merge: true });
        }
      } catch (error: any) {
        console.error("AI Strategist Error:", error);
        // Log failure
        try {
          await addDoc(collection(db, 'ai_logs'), {
            uid: user.uid,
            action: 'Strategy Generation',
            targetTitle: task.title,
            status: 'failed',
            message: error.message || 'Unknown error occurred',
            timestamp: new Date().toISOString()
          });
        } catch (logErr) {
          console.error("Failed to log AI error:", logErr);
        }
      } finally {
        // We don't remove from processingTasks to avoid re-processing in the same session
        // if the update fails or doesn't immediately reflect in 'entities'
      }
    };

    const timeout = setTimeout(runStrategist, 2000); // Debounce
    return () => clearTimeout(timeout);
  }, [entities, user, processingTasks]);

  const addEntity = async (entity: Entity) => {
    if (!user) return;
    const entityWithUid = { ...entity, uid: user.uid };
    await storage.addEntity(entityWithUid);
  };
  
  const deleteEntity = async (id: string) => {
    await storage.deleteEntity(id);
  };
  
  const updateEntity = async (entity: Entity) => {
    if (!user) return;
    const updated = { ...entity, uid: user.uid, updatedAt: new Date().toISOString() };
    await storage.updateEntity(updated);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      hasLoadedFromStorage.current = false;
      setEntities([]);
      setProcessingTasks(new Set());
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleImport = async (importedEntities: Entity[]) => {
    if (!user) return;
    const entitiesWithUid = importedEntities.map(e => ({ ...e, uid: user.uid }));
    hasLoadedFromStorage.current = true;
    setEntities(entitiesWithUid);
    await storage.saveEntities(entitiesWithUid);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] animate-pulse">
        Initializing OS...
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Layout onLogout={handleLogout} entities={entities} onImport={handleImport}>
          <Routes>
            <Route path="/" element={<Dashboard entities={entities} processingTasks={processingTasks} />} />
            <Route path="/brain" element={<KnowledgeBrain entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} processingTasks={processingTasks} />} />
            <Route path="/jobs" element={<JobsPipeline entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} processingTasks={processingTasks} />} />
            <Route path="/clients" element={<ClientsTasks entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} processingTasks={processingTasks} />} />
            <Route path="/subscriptions" element={<Subscriptions entities={entities} onAdd={addEntity} onDelete={deleteEntity} onUpdate={updateEntity} processingTasks={processingTasks} />} />
            <Route path="/developer" element={<DeveloperPortal />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
