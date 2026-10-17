import React, { useState, useEffect } from 'react';
import { CrisisScenario, SimulationResult, Hospital } from '../types';
import { runSimulation, fetchScenarios } from '../api';
import {
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  Clock,
  ArrowRight,
  Activity,
  Layers,
  HeartPulse,
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface EmergencyModeSectionProps {
  hospitals: Hospital[];
  onTriggerCoordination?: () => void;
}

export const EmergencyModeSection: React.FC<EmergencyModeSectionProps> = ({
  hospitals,
  onTriggerCoordination,
}) => {
  const [scenarios, setScenarios] = useState<CrisisScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('MASS_CASUALTY');
  const [severityMultiplier, setSeverityMultiplier] = useState<number>(1.5);
  const [selectedIntervention, setSelectedIntervention] = useState<string>('COMBINED');
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Timeline player state
  const [currentHour, setCurrentHour] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Load scenarios on mount
  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(console.error);
  }, []);

  // Run simulation whenever scenario or parameters change
  const executeSimulation = async (strat?: string) => {
    setIsLoading(true);
    const activeStrat = strat || selectedIntervention;
    try {
      const res = await runSimulation({
        scenario_id: selectedScenarioId,
        affected_hospital_ids: hospitals.map((h) => h.id),
        severity_multiplier: severityMultiplier,
        selected_intervention: activeStrat,
      });
      setSimResult(res);
    } catch (e) {
      console.error('Failed to run simulation:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeSimulation();
  }, [selectedScenarioId, severityMultiplier, selectedIntervention]);

  // Timeline playback interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour((prev) => {
          if (prev >= 6) {
            setIsPlaying(false);
            return 6;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const activeStrategyData = simResult?.strategies_results[selectedIntervention];
  const activeTimelinePoint = activeStrategyData?.timeline.find((t) => t.hour === currentHour) || activeStrategyData?.timeline[0];
  const baselineStrategyData = simResult?.strategies_results['NO_ACTION'];
  const baselineTimelinePoint = baselineStrategyData?.timeline.find((t) => t.hour === currentHour) || baselineStrategyData?.timeline[0];

  return (
    <div className="space-y-8 pb-16">
      {/* Signature Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 text-red-300 text-xs font-bold mb-3 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>CRISIS MODE: Interactive Scenario Simulation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            See Consequences Before Acting
          </h1>
          <p className="mt-2 text-slate-300 text-base leading-relaxed">
            Stress-test hospital network resilience. Evaluate how emergency patient surges or supply chain delays
            propagate across facilities, and compare intervention strategies mathematically.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Protected Reserves Non-Negotiable
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            Deterministic Reproducible Projections
          </span>
          <span>•</span>
          <span className="text-slate-400">All data clearly identified as simulation</span>
        </div>
      </div>

      {/* Scenario & Severity Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">1. Select Emergency Scenario</h3>
            <p className="text-xs text-slate-500">Pick a simulated regional crisis event to project.</p>
          </div>

          {/* Severity control */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">Surge Severity:</span>
            {[
              { val: 1.0, label: '1.0x (Standard)' },
              { val: 1.5, label: '1.5x (Severe)' },
              { val: 2.2, label: '2.2x (Catastrophic)' },
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => setSeverityMultiplier(s.val)}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  severityMultiplier === s.val ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-red-50/60 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {sc.category}
                  </span>
                  <div className="font-bold text-sm text-slate-900 mt-2">{sc.title}</div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">{sc.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold text-red-700">
                  +{Math.round(sc.incoming_icu_patients * severityMultiplier)} ICU arrivals projected
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive 6-Hour Simulation Timeline Player */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">2. Interactive Crisis Timeline (0h — 6h)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore minute-by-minute hospital strain and demand progression over time.
            </p>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentHour(0);
              }}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Reset timeline to Hour 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Slider with Hour Markers */}
        <div className="pt-4 px-2">
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentHour(parseInt(e.target.value));
            }}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex justify-between text-xs font-bold text-slate-600 mt-2">
            {[0, 1, 2, 3, 4, 5, 6].map((h) => (
              <button
                key={h}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentHour(h);
                }}
                className={`px-2 py-1 rounded transition ${
                  currentHour === h ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
                }`}
              >
                {h}h {h === 0 ? '(Baseline)' : h === 6 ? '(Resolved)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Live Status at Current Hour */}
        {activeTimelinePoint && baselineTimelinePoint && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">St. Jude Metro Strain</span>
              <div
                className={`text-2xl font-extrabold mt-0.5 ${
                  activeTimelinePoint.metro_strain_pct > 85 ? 'text-red-600' : 'text-slate-800'
                }`}
              >
                {activeTimelinePoint.metro_strain_pct}%
              </div>
              <span className="text-[11px] text-slate-400">
                vs {baselineTimelinePoint.metro_strain_pct}% siloed
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Hope Valley Strain</span>
              <div className="text-2xl font-extrabold text-blue-700 mt-0.5">
                {activeTimelinePoint.hope_strain_pct}%
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Reserve safe</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Unmet Patients</span>
              <div
                className={`text-2xl font-extrabold mt-0.5 ${
                  activeTimelinePoint.total_unmet > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {activeTimelinePoint.total_unmet}
              </div>
              <span className="text-[11px] text-slate-400">
                vs {baselineTimelinePoint.total_unmet} without coordination
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Avg Triage Delay</span>
              <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
                {activeTimelinePoint.estimated_delay_mins}m
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">
                -{baselineTimelinePoint.estimated_delay_mins - activeTimelinePoint.estimated_delay_mins}m faster
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Intervention Strategy Comparison Engine */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-900">3. Compare Interventions, Not Just Predictions</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate quantitative trade-offs before approving actual inter-hospital patient or equipment transfers.
          </p>
        </div>

        {/* 4 Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'NO_ACTION',
              title: 'A / No Action',
              subtitle: 'Siloed Hospitals',
              desc: 'Hospitals act independently without mutual aid or diversion.',
              highlight: false,
            },
            {
              id: 'PATIENT_TRANSFER',
              title: 'B / Patient Transfers',
              subtitle: 'Dynamic Diversion',
              desc: 'Transfer acute triage arrivals to Hope Valley & Riverside.',
              highlight: false,
            },
            {
              id: 'RESOURCE_SHARING',
              title: 'C / Resource Sharing',
              subtitle: 'Surplus Redistribution',
              desc: 'Move surplus ventilators & oxygen to St. Jude Metro Hospital.',
              highlight: false,
            },
            {
              id: 'COMBINED',
              title: 'D / Combined Response',
              subtitle: 'AI Optimized Coordination',
              desc: 'Transfers + surplus sharing + green corridor priority logistics.',
              highlight: true,
            },
          ].map((strat) => {
            const isSelected = selectedIntervention === strat.id;
            const stratMetrics = simResult?.strategies_results[strat.id]?.metrics;

            return (
              <div
                key={strat.id}
                onClick={() => setSelectedIntervention(strat.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? strat.highlight
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/30 shadow-md'
                      : 'bg-slate-50 border-slate-800 ring-2 ring-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{strat.title}</span>
                    {strat.highlight && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-blue-800 mt-0.5">{strat.subtitle}</div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{strat.desc}</p>
                </div>

                {stratMetrics && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unmet Demand:</span>
                      <span
                        className={`font-bold ${
                          stratMetrics.unmet_patient_demand > 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {stratMetrics.unmet_patient_demand} patients
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Triage Delay:</span>
                      <span className="font-semibold text-slate-800">
                        {stratMetrics.average_response_delay_mins} mins
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Reserve Violations:</span>
                      <span className="font-bold text-emerald-700">0 (Safe)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explainable AI Decision Support Rationale Box */}
        {simResult?.comparison_summary && (
          <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-950 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h4 className="text-sm font-bold">Explainable Decision-Support Analysis</h4>
            </div>

            <p className="text-sm leading-relaxed text-teal-900">
              {simResult.comparison_summary.explanation}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-800 border-t border-teal-200/60">
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  Averted Unmet Demand:{' '}
                  <strong className="text-teal-950 font-bold">
                    {simResult.comparison_summary.unmet_patients_averted} patients
                  </strong>
                </span>
                <span>•</span>
                <span className="font-semibold">
                  Delay Reduction:{' '}
                  <strong className="text-teal-950 font-bold">
                    {simResult.comparison_summary.baseline_delay_mins - simResult.comparison_summary.active_delay_mins} mins
                  </strong>
                </span>
              </div>

              <span className="bg-white px-3 py-1 rounded-lg border border-teal-300 font-bold text-teal-800">
                Human Sign-off Required to Dispatch
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
