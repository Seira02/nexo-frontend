"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, Network, Server, Zap, AlertTriangle, X } from "lucide-react";

// Import your actual API function
const getLiveMetrics = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/live/`,
    { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('API Error:', res.status, text);
    throw new Error(`Failed to fetch metrics: ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    console.error('Non-JSON response:', text.substring(0, 200));
    throw new Error("API returned non-JSON response");
  }

  return res.json();
};

interface MetricsData {
  cpu: { usage: number; cores: number };
  memory: { percent: number; used: string; total: string };
  disk: { percent: number; used: string; total: string };
  network: { total: string; download: string; upload: string };
  system?: Record<string, unknown>;
  top_processes?: Array<{ pid: number; name: string; cpu: number }>;
}

interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk';
  message: string;
  percent: number;
}

// Thresholds
const WARNING_THRESHOLD = 70;
const CRITICAL_THRESHOLD = 85;

export default function Dashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [time, setTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Add custom CSS animations on mount (client-side only)
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slide-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slide-in-right {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes pulse-warning {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }

      .animate-slide-up {
        animation: slide-up 0.8s ease-out forwards;
      }

      .animate-slide-in-right {
        animation: slide-in-right 0.4s ease-out forwards;
      }

      .animate-pulse-warning {
        animation: pulse-warning 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);

    const load = async () => {
      try {
        const res = await getLiveMetrics();
        setData(res);
        setTime(new Date().toLocaleTimeString());
        setError(null);
        setIsLoading(false);
        
        // Check for alerts
        checkAlerts(res);
      } catch (e) {
        console.error('Error loading metrics:', e);
        setError(e instanceof Error ? e.message : 'Failed to load metrics');
        setIsLoading(false);
      }
    };

    const checkAlerts = (metricsData: MetricsData) => {
      const newAlerts: Alert[] = [];
      
      if (metricsData.cpu.usage >= CRITICAL_THRESHOLD) {
        newAlerts.push({
          id: `cpu-${Date.now()}`,
          type: 'cpu',
          message: `CPU usage critical: ${metricsData.cpu.usage}%`,
          percent: metricsData.cpu.usage
        });
      }
      
      if (metricsData.memory.percent >= CRITICAL_THRESHOLD) {
        newAlerts.push({
          id: `memory-${Date.now()}`,
          type: 'memory',
          message: `Memory usage critical: ${metricsData.memory.percent}%`,
          percent: metricsData.memory.percent
        });
      }
      
      if (metricsData.disk.percent >= CRITICAL_THRESHOLD) {
        newAlerts.push({
          id: `disk-${Date.now()}`,
          type: 'disk',
          message: `Disk space critical: ${metricsData.disk.percent}%`,
          percent: metricsData.disk.percent
        });
      }
      
      setAlerts(newAlerts);
    };
    
    load();
    const id = setInterval(load, 1000); // Update every second
    
    return () => {
      clearInterval(id);
      document.head.removeChild(style);
    };
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-red-400 text-lg mb-2">Connection Error</p>
              <p className="text-slate-400 text-sm max-w-md">{error}</p>
              <p className="text-slate-500 text-xs mt-4">
                Check console for details • Verify API URL: {process.env.NEXT_PUBLIC_API_URL}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-lg">Initializing Dashboard...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 sm:p-6 lg:p-8">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className="bg-gradient-to-r from-red-900 to-red-800 border-2 border-red-500 rounded-xl p-4 shadow-2xl shadow-red-500/50 animate-slide-in-right flex items-start gap-3"
            >
              <AlertTriangle className="w-6 h-6 text-red-300 flex-shrink-0 animate-pulse-warning" />
              <div className="flex-1">
                <h3 className="font-bold text-red-100 mb-1">Critical Alert</h3>
                <p className="text-red-200 text-sm">{alert.message}</p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-red-300 hover:text-red-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
              <Server className="w-8 h-8 text-cyan-400 animate-pulse" />
              Server Monitor
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live • Updated: {time}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 border border-slate-700 relative">
              <Activity className="w-4 h-4 inline mr-2" />
              Alerts
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50">
              <Zap className="w-4 h-4 inline mr-2" />
              Actions
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard 
            icon={<Cpu className="w-6 h-6" />}
            title="CPU Usage" 
            value={`${data.cpu.usage}%`}
            sub={`${data.cpu.cores} cores`}
            percent={data.cpu.usage}
          />
          <MetricCard 
            icon={<Activity className="w-6 h-6" />}
            title="Memory" 
            value={`${data.memory.percent}%`}
            sub={`${data.memory.used} / ${data.memory.total}`}
            percent={data.memory.percent}
          />
          <MetricCard 
            icon={<HardDrive className="w-6 h-6" />}
            title="Disk Space" 
            value={`${data.disk.percent}%`}
            sub={`${data.disk.used} / ${data.disk.total}`}
            percent={data.disk.percent}
          />
          <MetricCard 
            icon={<Network className="w-6 h-6" />}
            title="Network" 
            value={`${data.network.total} MB`}
            sub={`↓ ${data.network.download} ↑ ${data.network.upload}`}
            percent={50}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Information */}
          <Section title="System Information" icon={<Server className="w-5 h-5" />}>
            <div className="space-y-3">
              {Object.entries(data.system || {}).map(([k, v], i) => (
                <Row key={k} label={k} value={v} delay={i * 50} />
              ))}
            </div>
          </Section>

          {/* Top Processes */}
          <Section title="Top Processes" icon={<Activity className="w-5 h-5" />}>
            <div className="space-y-2">
              {data.top_processes?.map((p, i) => (
                <ProcessRow key={p.pid} process={p} delay={i * 50} />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function getColorForUsage(percent: number) {
  if (percent >= CRITICAL_THRESHOLD) {
    return {
      gradient: "from-red-500 to-red-600",
      bg: "from-red-900 to-red-800",
      border: "border-red-500",
      glow: "shadow-red-500/50",
      text: "text-red-400",
      badge: "bg-red-500/20 text-red-300"
    };
  } else if (percent >= WARNING_THRESHOLD) {
    return {
      gradient: "from-yellow-500 to-orange-500",
      bg: "from-yellow-900/50 to-orange-900/50",
      border: "border-yellow-500/50",
      glow: "shadow-yellow-500/30",
      text: "text-yellow-400",
      badge: "bg-yellow-500/20 text-yellow-300"
    };
  } else {
    return {
      gradient: "from-green-500 to-emerald-500",
      bg: "from-slate-900 to-slate-800",
      border: "border-slate-700",
      glow: "shadow-slate-900/50",
      text: "text-green-400",
      badge: "bg-green-500/20 text-green-300"
    };
  }
}

function MetricCard({ icon, title, value, sub, percent }: { icon: React.ReactNode; title: string; value: string; sub: string; percent: number }) {
  const colors = getColorForUsage(percent);
  const isWarning = percent >= WARNING_THRESHOLD;

  return (
    <div className={`group relative bg-gradient-to-br ${colors.bg} rounded-2xl p-6 border ${colors.border} hover:border-slate-600 transition-all duration-500 hover:scale-105 hover:shadow-xl ${colors.glow} animate-slide-up overflow-hidden ${isWarning ? 'animate-pulse-warning' : ''}`}>
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-${isWarning ? '20' : '0'} group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      {/* Progress bar background */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <div 
          className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-1000 ease-out`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.badge}`}>
            {percent}%
          </div>
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className={`text-3xl font-bold mb-1 group-hover:scale-105 transition-transform duration-300 ${isWarning ? colors.text : ''}`}>
          {value}
        </p>
        <p className="text-xs text-slate-500">{sub}</p>
        
        {percent >= CRITICAL_THRESHOLD && (
          <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Critical</span>
          </div>
        )}
        {percent >= WARNING_THRESHOLD && percent < CRITICAL_THRESHOLD && (
          <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Warning</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300 animate-slide-up shadow-lg hover:shadow-xl">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 bg-opacity-10">
          {icon}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, delay }: { label: string; value: unknown; delay: number }) {
  return (
    <div 
      className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-800 bg-opacity-50 hover:bg-opacity-100 transition-all duration-300 animate-fade-in border border-transparent hover:border-slate-600"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="capitalize text-slate-300 font-medium">
        {label.replace(/_/g, " ")}
      </span>
      <span className="text-white font-semibold">{String(value)}</span>
    </div>
  );
}

function ProcessRow({ process, delay }: { process: { pid: number; name: string; cpu: number }; delay: number }) {
  const cpuPercent = Math.min((process.cpu / 30) * 100, 100);
  const colors = getColorForUsage(process.cpu);
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-slate-800 bg-opacity-50 hover:bg-opacity-100 transition-all duration-300 group animate-fade-in border border-transparent hover:border-slate-600"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2 h-2 rounded-full ${process.cpu >= CRITICAL_THRESHOLD ? 'bg-red-400' : process.cpu >= WARNING_THRESHOLD ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></div>
        <div>
          <span className="font-mono text-sm font-semibold">{process.name}</span>
          <span className="text-xs text-slate-500 ml-2">PID: {process.pid}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-1000 rounded-full`}
            style={{ width: `${cpuPercent}%` }}
          ></div>
        </div>
        <span className={`text-sm font-bold min-w-[3rem] text-right ${process.cpu >= WARNING_THRESHOLD ? colors.text : ''}`}>
          {process.cpu}%
        </span>
      </div>
    </div>
  );
}