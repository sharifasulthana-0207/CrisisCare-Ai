import React from 'react';
import {
  Bed,
  Truck,
  Inbox,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Building,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface OverviewSectionProps {
  overviewData: any;
  onNavigateTab: (tab: string) => void;
  onOpenQuickRequest: () => void;
  onStartSimulation: () => void;
  onOpenMap: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  overviewData,
  onNavigateTab,
  onOpenQuickRequest,
  onStartSimulation,
  onOpenMap,
}) => {
  const summary = overviewData?.summary || {
    available_usable_beds: 0,
    available_usable_icu: 0,
    available_ambulances: 0,
    active_requests_count: 0,
    needs_attention_count: 0,
  };

  const alerts = overviewData?.alerts || [];
  const activity = overviewData?.recent_activity || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Sub-header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Regional Capacity & Emergency Response Orchestration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Good morning, Hospital Network Coordinator
          </h1>
          <p className="mt-2 text-blue-100 text-base leading-relaxed">
            Real-time constraint-aware capacity intelligence across 3 interconnected facilities in Central Metro.
            Evaluate shortages, verify protected reserves, and simulate emergency responses safely.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab('emergency')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition text-sm cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Launch Crisis Simulator</span>
            </button>
            <button
              onClick={onOpenQuickRequest}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl shadow-md transition text-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Request Resource</span>
            </button>
            <button
              onClick={onOpenMap}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900/50 hover:bg-blue-900/70 border border-white/30 text-white font-semibold rounded-xl transition text-sm cursor-pointer"
            >
              <Building className="w-4 h-4" />
              <span>View City Health Map</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle medical cross background */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <div className="w-80 h-80 rounded-full border-40 border-white"></div>
        </div>
      </div>

      {/* 4 Primary Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">1. What is available right now?</h2>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Live Staff-Constrained Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Usable Beds */}
          <div
            onClick={() => onNavigateTab('resources')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bed className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                Staffed & Usable
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.available_usable_beds}
              </div>
              <div className="text-base font-semibold text-slate-700 mt-1">Usable Hospital Beds</div>
              <p className="text-xs text-slate-500 mt-1">
                Includes <span className="font-semibold text-slate-700">{summary.available_usable_icu}</span> staffed ICU beds
              </p>
            </div>
          </div>

          {/* Card 2: Ambulances */}
          <div
            onClick={() => onNavigateTab('resources')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                Ready Now
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.available_ambulances}
              </div>
              <div className="text-base font-semibold text-slate-700 mt-1">Available Ambulances</div>
              <p className="text-xs text-slate-500 mt-1">Ready for priority transfer or dispatch</p>
            </div>
          </div>

          {/* Card 3: Active Requests */}
          <div
            onClick={() => onNavigateTab('requests')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Inbox className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-800">
                Queue
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.active_requests_count}
              </div>
              <div className="text-base font-semibold text-slate-700 mt-1">Active Requests</div>
              <p className="text-xs text-slate-500 mt-1">Resource sharing requests awaiting review</p>
            </div>
          </div>

          {/* Card 4: Needs Attention */}
          <div
            onClick={() => onNavigateTab('resources')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                summary.needs_attention_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                summary.needs_attention_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {summary.needs_attention_count > 0 ? 'Attention Needed' : 'Normal'}
              </span>
            </div>
            <div className="mt-4">
              <div className={`text-3xl font-extrabold tracking-tight ${
                summary.needs_attention_count > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}>
                {summary.needs_attention_count}
              </div>
              <div className="text-base font-semibold text-slate-700 mt-1">Hospitals Under Strain</div>
              <p className="text-xs text-slate-500 mt-1">Approaching ICU or oxygen reserves</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Important Alerts & Recent Coordination Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">2. What needs attention?</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">Automated Shortage Projections</span>
          </div>

          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700">All participating facilities are healthy</p>
              <p className="text-xs text-slate-500">All supplies and ICU beds are comfortably above 20% protected reserve.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{alert.hospital_name}</span>
                    </div>
                    <p className="text-sm mt-1 text-slate-700 leading-snug">{alert.message}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{alert.time}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('requests')}
                    className="shrink-0 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs shadow-xs cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Coordination Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">Recent Network Activity</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">Auditable Log</span>
          </div>

          <div className="space-y-3">
            {activity.slice(0, 4).map((item: any) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-blue-700">{item.action}</span>
                  <span>{item.time}</span>
                </div>
                <p className="text-slate-800 font-medium text-sm leading-snug">{item.details}</p>
                <div className="text-[11px] text-slate-500 mt-1">By: {item.user_role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">3. What should I do next?</h3>
        <p className="text-sm text-slate-600 mb-4">
          Select an action below to quickly inspect hospital profiles, submit emergency resource requests, or run crisis drills.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateTab('hospitals')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition text-center cursor-pointer"
          >
            <Building className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-bold text-slate-800">Find Hospital</span>
            <span className="text-[11px] text-slate-500 mt-0.5">3 facilities</span>
          </button>

          <button
            onClick={() => onNavigateTab('resources')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition text-center cursor-pointer"
          >
            <Bed className="w-6 h-6 text-teal-600 mb-2" />
            <span className="text-sm font-bold text-slate-800">Check Resources</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Inventory view</span>
          </button>

          <button
            onClick={onOpenQuickRequest}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:shadow-xs transition text-center cursor-pointer"
          >
            <Share2 className="w-6 h-6 text-blue-700 mb-2" />
            <span className="text-sm font-bold text-blue-900">Request Resources</span>
            <span className="text-[11px] text-blue-700 mt-0.5">Guided 5-step</span>
          </button>

          <button
            onClick={() => onNavigateTab('resources')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition text-center cursor-pointer"
          >
            <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
            <span className="text-sm font-bold text-slate-800">View Shortages</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Forecasting</span>
          </button>

          <button
            onClick={onStartSimulation}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 hover:shadow-xs transition text-center cursor-pointer col-span-2 sm:col-span-1"
          >
            <ShieldAlert className="w-6 h-6 text-red-600 mb-2" />
            <span className="text-sm font-bold text-red-900">Start Simulation</span>
            <span className="text-[11px] text-red-700 mt-0.5">Crisis Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
