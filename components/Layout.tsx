
import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Entity } from '../types';

const NavItem = ({ to, icon, label, active }: { to: string, icon: string, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
      active ? 'bg-black text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

export const Layout: React.FC<{ 
  children: React.ReactNode, 
  onLogout: () => void,
  entities: Entity[],
  onImport: (entities: Entity[]) => void
}> = ({ children, onLogout, entities, onImport }) => {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(entities, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `thinkstack_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          onImport(json);
          alert('System OS Restored Successfully.');
        }
      } catch (err) {
        alert('Failed to parse backup file. Ensure it is a valid ThinkStack JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="w-64 border-r border-slate-200 bg-white p-6 flex flex-col fixed h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-8 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ThinkStack<span className="text-blue-600">.</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Session Active</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          <NavItem to="/" icon="🏠" label="Home" active={location.pathname === '/'} />
          <NavItem to="/brain" icon="🧠" label="Knowledge" active={location.pathname.startsWith('/brain')} />
          <NavItem to="/jobs" icon="💼" label="Jobs" active={location.pathname.startsWith('/jobs')} />
          <NavItem to="/clients" icon="🤝" label="Clients & Tasks" active={location.pathname.startsWith('/clients')} />
          <NavItem to="/subscriptions" icon="💳" label="Subscriptions" active={location.pathname.startsWith('/subscriptions')} />
          <NavItem to="/developer" icon="⚙️" label="Developer" active={location.pathname.startsWith('/developer')} />
        </nav>

        <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-tighter hover:bg-slate-100 transition-all border border-slate-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Export
            </button>
            <button 
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-tighter hover:bg-slate-100 transition-all border border-slate-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Import
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleFileChange} 
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-black flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
                OS
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-none">Strategic User</p>
                <p className="text-[10px] text-green-500 font-bold">Online</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Reset Session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 max-w-6xl mx-auto">
        <div className="animate-in fade-in duration-700">
          {children}
        </div>
      </main>
    </div>
  );
};
