import React from 'react';
import {
  Activity,
  Building2,
  Package,
  FileText,
  AlertTriangle,
  MapPin,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMap: () => void;
  onStartDemo: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenMap,
  onStartDemo,
  onResetDemo,
  isResetting,
}) => {
  const navItems = [
    { id: 'overview', label: '1. Overview', icon: Activity },
    { id: 'hospitals', label: '2. Hospitals', icon: Building2 },
    { id: 'resources', label: '3. Resources', icon: Package },
    { id: 'requests', label: '4. Requests', icon: FileText },
    { id: 'emergency', label: '5. Emergency Mode', icon: AlertTriangle, highlight: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner / District Context */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-emerald-400">CRISISCARE AI</span>
          <span className="text-slate-400">|</span>
          <span>Central Metro Regional Hospital Coordination Network</span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Verified Decision Support (Human-in-the-Loop)
          </span>
          <span className="text-slate-500">|</span>
          <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-[11px] font-medium">
            Synthetic Demo Data
          </span>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">CRISISCARE</span>
                <span className="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Smarter Coordination. Faster Response. Better Preparedness.
              </p>
            </div>
          </div>

          {/* Quick Actions & Walkthrough Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onStartDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-xs"
              title="Launch 90-second MSME Hackathon presentation walkthrough"
            >
              <PlayCircle className="w-4 h-4 text-teal-600" />
              <span>90s Demo Story</span>
            </button>

            <button
              onClick={onOpenMap}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition shadow-xs"
              title="Open interactive city health map"
            >
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">City View</span>
            </button>

            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              title="Reset demo data to baseline state"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Reset Baseline</span>
            </button>

            {/* User Profile Pill */}
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                SV
              </div>
              <div>
                <div className="font-medium text-slate-800 text-xs leading-tight">Dr. Sarah Vance</div>
                <div className="text-[11px] text-slate-500">Emergency Coord.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary 5-Section Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? item.highlight
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : item.highlight
                    ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-red-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-200 text-red-800'
                  }`}>
                    Signature
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
