import React from 'react';
import { Atom, Grid3X3, Settings, Home, Menu, X } from 'lucide-react';
import { AppState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, appState, setAppState }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'input', label: 'Create', icon: Home },
    { id: 'gallery', label: 'Gallery', icon: Grid3X3 },
    // Settings is usually a modal or separate view, but for now we can keep it here or just show it as a button
  ];

  const handleNavClick = (state: AppState) => {
    setAppState(state);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-science-blue/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-science-purple/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen glass-panel border-r border-white/5 z-50 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-science-blue blur-md opacity-50 animate-pulse"></div>
            <Atom className="w-8 h-8 text-science-blue relative z-10" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight hidden lg:block text-transparent bg-clip-text bg-gradient-to-r from-science-blue to-science-teal">
            ScienceSnap
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = appState === item.id || (item.id === 'input' && ['selection', 'planning', 'generating', 'result'].includes(appState));
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as AppState)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-science-blue/10 text-science-blue border border-science-blue/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-science-blue' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="hidden lg:block font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-science-blue shadow-[0_0_8px_rgba(14,165,233,0.8)] hidden lg:block" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all">
            <Settings className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/5 z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <Atom className="w-6 h-6 text-science-blue" />
          <span className="font-display font-bold text-lg">ScienceSnap</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl pt-20 px-6 md:hidden">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as AppState)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 text-lg font-medium"
              >
                <item.icon className="w-6 h-6 text-science-blue" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen relative z-10 scrollbar-hide">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
};
