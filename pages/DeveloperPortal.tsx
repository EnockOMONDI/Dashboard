
import React, { useState, useEffect } from 'react';
import { auth, db, doc, setDoc, collection, query, where, orderBy, onSnapshot } from '../firebase';
import firebaseConfig from '../firebase-applet-config.json';

export const DeveloperPortal: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testKey, setTestKey] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  const userEmail = auth.currentUser?.email || 'Not Logged In';
  const apiKey = 'Managed in Secrets';
  const baseUrl = window.location.origin + '/api/external';

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'ai_logs'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setApiStatus('online');
        else setApiStatus('offline');
      } catch (e) {
        setApiStatus('offline');
      }
    };
    checkStatus();
  }, []);

  const runTest = async () => {
    if (!testKey) {
      alert('Please enter your API Key to test.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch('/api/external/verify', {
        headers: {
          'x-api-key': testKey,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const runLookup = async () => {
    if (!testKey || !lookupEmail) {
      alert('Please enter API Key and Email to lookup.');
      return;
    }
    setIsLookingUp(true);
    setLookupResult(null);

    // Check for common typos
    if (lookupEmail.toLowerCase().endsWith('@gmall.com') || lookupEmail.toLowerCase().endsWith('@gmall')) {
      console.warn("Detected potential typo in email: 'gmall' instead of 'gmail'");
    }

    try {
      const res = await fetch(`/api/external/user-lookup?email=${encodeURIComponent(lookupEmail)}`, {
        headers: {
          'x-api-key': testKey,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      setLookupResult(data);
    } catch (e: any) {
      setLookupResult({ error: e.message, details: e.details });
    } finally {
      setIsLookingUp(false);
    }
  };

  const forceSync = async () => {
    if (!auth.currentUser) return;
    setIsSyncing(true);
    setSyncStatus('Syncing...');
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email?.toLowerCase().trim(),
        displayName: auth.currentUser.displayName,
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSyncStatus('✅ Sync Successful!');
    } catch (e: any) {
      setSyncStatus(`❌ Sync Failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Developer Portal</h1>
        <p className="text-slate-500 mt-1 font-medium italic">Configure your AI Agent and debug API connections.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Status & User Lookup */}
        <div className="space-y-8">
          <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">System Link</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                apiStatus === 'online' ? 'bg-green-50 text-green-600 border border-green-100' : 
                apiStatus === 'offline' ? 'bg-red-50 text-red-600 border border-red-100' : 
                'bg-slate-50 text-slate-400 border border-slate-100'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <span>API {apiStatus}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Base URL</p>
                <code className="text-xs font-mono text-blue-600 break-all">{baseUrl}</code>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Firebase Project ID</p>
                <code className="text-xs font-mono text-slate-700">{firebaseConfig.projectId}</code>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Your User Email (Context)</p>
                <code className="text-xs font-mono text-slate-700">{userEmail}</code>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">API Key (Enter to Test)</p>
                <input 
                  type="password"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  placeholder="Enter your secret key..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={runTest}
              disabled={isTesting}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isTesting ? (
                <span className="animate-spin text-lg">⚙️</span>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Test Local Connection</span>
                </>
              )}
            </button>

            {testResult && (
              <div className={`p-4 rounded-2xl border ${testResult.authorized ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <p className="text-[10px] font-bold uppercase mb-2">Result</p>
                <pre className="text-[10px] font-mono overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </section>

          {/* User Registry Lookup */}
          <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">User Registry Lookup</h2>
            
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase">Step 1: Sync your profile</p>
                  <p className="text-[10px] text-slate-500 font-medium">Maps your email to your User ID in the database.</p>
                </div>
              </div>
              <button 
                onClick={forceSync}
                disabled={isSyncing}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {isSyncing ? <span className="animate-spin text-lg">⚙️</span> : <span>🔄 Force Profile Sync</span>}
              </button>
              {syncStatus && (
                <p className={`text-[10px] font-bold text-center p-2 rounded-lg ${syncStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {syncStatus}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Step 2: Verify Registration</p>
              <p className="text-xs text-slate-500">Check if your email is now correctly registered.</p>
              <input 
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="Enter email to lookup..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {(lookupEmail.toLowerCase().includes('gmall')) && (
                <p className="text-[10px] text-amber-600 font-bold mt-2 flex items-center">
                  <span className="mr-1">⚠️</span> Did you mean @gmail.com?
                </p>
              )}
              <button 
                onClick={runLookup}
                disabled={isLookingUp}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLookingUp ? <span className="animate-spin text-lg">⚙️</span> : <span>🔍 Verify User</span>}
              </button>
            </div>

            {lookupResult && (
              <div className={`p-4 rounded-2xl border ${lookupResult.exists ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                <p className="text-[10px] font-bold uppercase mb-2">Registry Status</p>
                {lookupResult.exists ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold">
                      {lookupResult.status === 'registered' ? '✅ Registered User' : '📥 Pending in Inbox'}
                    </p>
                    {lookupResult.uid && <p className="text-[10px] font-mono opacity-70">UID: {lookupResult.uid}</p>}
                    {lookupResult.message && <p className="text-[10px] italic opacity-80">{lookupResult.message}</p>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold">❌ User Not Found</p>
                    <p className="text-[10px] opacity-70">No registry record or inbox tasks found for this email.</p>
                  </div>
                )}
                {lookupResult.debug && (
                  <div className="mt-2 p-2 bg-slate-100 rounded-lg text-[8px] font-mono opacity-50">
                    <p>Project: {lookupResult.debug.projectId}</p>
                    <p>DB: {lookupResult.debug.databaseId}</p>
                  </div>
                )}
                {lookupResult.error && (
                  <div className="mt-2 p-2 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-700 font-bold">{lookupResult.error}</p>
                    {lookupResult.details && <p className="text-[10px] text-red-600 font-mono mt-1">Code: {lookupResult.details}</p>}
                    {lookupResult.debug && (
                      <div className="mt-2 p-1 bg-red-200/50 rounded text-[8px] font-mono text-red-800">
                        <p>Proj: {lookupResult.debug.projectId}</p>
                        <p>EnvProj: {lookupResult.debug.envProject}</p>
                        <p>AppProj: {lookupResult.debug.appProjectId}</p>
                        <p>DB: {lookupResult.debug.databaseId}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Bot Instructions */}
        <section className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl space-y-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Bot Configuration</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-200">1. Required Headers</p>
              <div className="bg-slate-800 p-4 rounded-xl font-mono text-[10px] text-slate-300 space-y-1">
                <p>x-api-key: {apiKey}</p>
                <p>Content-Type: application/json</p>
                <p>Accept: application/json</p>
                <p>User-Agent: Mozilla/5.0 ... (Spoof Browser)</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-200">2. Sample Payload (Task)</p>
              <div className="bg-slate-800 p-4 rounded-xl font-mono text-[10px] text-slate-300">
                <pre>{`{
  "userEmail": "${userEmail}",
  "title": "New Strategic Task",
  "priority": "High",
  "clientName": "Acme Corp"
}`}</pre>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Pro Tip</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                If your bot receives HTML instead of JSON, it means the security proxy is active. 
                Ensure the <code className="text-blue-400">Referer</code> header is set to <code className="text-blue-400">https://ai.studio/</code>.
              </p>
            </div>

            {/* AI Agent History */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">AI Agent History</h3>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                  {aiLogs.length} Events
                </span>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {aiLogs.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No activity recorded yet</p>
                  </div>
                ) : (
                  aiLogs.map((log) => (
                    <div key={log.id} className="bg-slate-800/50 border border-slate-800 p-4 rounded-2xl space-y-2 transition-all hover:bg-slate-800">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{log.action}</p>
                          <p className="text-xs font-bold text-white leading-tight">{log.targetTitle}</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                          log.status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          log.status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                        }`}>
                          {log.status}
                        </div>
                      </div>
                      
                      {log.message && (
                        <p className="text-[10px] text-slate-400 font-medium italic line-clamp-2">
                          {log.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <p className="text-[8px] font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="text-[8px] font-mono text-slate-600">
                          ID: {log.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
