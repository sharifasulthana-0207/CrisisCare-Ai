import React, { useState } from 'react';
import { Hospital } from '../types';
import {
  Play,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  X
} from 'lucide-react';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  onNavigateTab: (tab: string) => void;
  onResetDemo: () => void;
}

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  onNavigateTab,
  onResetDemo,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      time: '00–15s',
      title: 'Baseline Conditions',
      tagline: '3 Fictional Connected Hospitals',
      desc: 'View St. Jude Metro, Hope Valley, and Riverside. Notice how usable capacity reflects on-duty nursing ratios and equipment availability, not merely empty beds.',
      actionLabel: 'Inspect Hospitals',
      actionTab: 'hospitals',
    },
    {
      step: 2,
      time: '15–30s',
      title: 'Emergency Trigger',
      tagline: 'Sudden Influx Surge',
      desc: 'Simulate a downtown mass-casualty incident. St. Jude Metro receives 65 urgent arrivals within 2 hours, stressing ICU beds and tripling liquid oxygen consumption.',
      actionLabel: 'Open Crisis Mode',
      actionTab: 'emergency',
    },
    {
      step: 3,
      time: '30–45s',
      title: 'Detect & Forecast',
      tagline: 'Predictive Shortage Countdown',
      desc: 'Mathematical shortage engine identifies that St. Jude Metro will breach its 20% protected oxygen reserve in approximately 4.2 hours without intervention.',
      actionLabel: 'View Forecasts',
      actionTab: 'resources',
    },
    {
      step: 4,
      time: '45–65s',
      title: 'Coordinate Mutual Aid',
      tagline: 'Fairness-Aware Surplus Matching',
      desc: 'The matching engine queries Hope Valley and Riverside. It verifies both can safely transfer surplus ventilators and oxygen while strictly retaining their own 20% safety reserve.',
      actionLabel: 'Review Transfer Options',
      actionTab: 'requests',
    },
    {
      step: 5,
      time: '65–80s',
      title: 'Human-in-the-Loop Approval',
      tagline: 'Transaction-Safe Reservation Ledger',
      desc: 'Authorized coordinator reviews and approves the transfer. The reservation ledger atomically locks the donor resources, guaranteeing no other hospital can double-allocate them.',
      actionLabel: 'Verify Reservation Ledger',
      actionTab: 'requests',
    },
    {
      step: 6,
      time: '80–90s',
      title: 'Compare Simulated Outcomes',
      tagline: 'Decision Intelligence',
      desc: 'Option D (Combined Response) averts untreated patient overflow, reduces triage delay by 24 minutes, and records ZERO reserve violations across the entire regional network.',
      actionLabel: 'Compare Interventions',
      actionTab: 'emergency',
    },
  ];

  const active = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
              90s
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Demonstration Story Walkthrough</h3>
              <p className="text-xs text-slate-500">MSME Hackathon • Healthcare Innovation Presentation Story</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Step Progress Pills */}
        <div className="grid grid-cols-6 gap-1 text-center">
          {steps.map((s) => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center ${
                currentStep === s.step
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStep > s.step
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className="text-[10px]">{s.time}</span>
              <span>Step {s.step}</span>
            </button>
          ))}
        </div>

        {/* Step Content Card */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {active.time} • Step {active.step} of 6
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">{active.tagline}</span>
          </div>

          <h4 className="text-xl font-extrabold text-slate-900">{active.title}</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{active.desc}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((p) => p - 1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => {
                onResetDemo();
                setCurrentStep(1);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onNavigateTab(active.actionTab);
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-300 text-blue-700 hover:bg-blue-50 rounded-xl shadow-xs transition"
            >
              {active.actionLabel}
            </button>

            {currentStep < 6 ? (
              <button
                onClick={() => setCurrentStep((p) => p + 1)}
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
              >
                Finish Demonstration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
