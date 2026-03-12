import React, { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ApiTesterProps {
  method: string;
  path: string;
  defaultBody?: any;
}

export default function ApiTester({ method, path, defaultBody }: ApiTesterProps) {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(defaultBody ? JSON.stringify(defaultBody, null, 2) : '');

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const res = await fetch(path, options);
      const data = await res.json();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-6 p-4 bg-white rounded-2xl border border-emerald-100 shadow-inner">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Live Test Tool</h4>
        <button 
          onClick={runTest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {loading ? 'Executing...' : 'Run Request'}
        </button>
      </div>

      {method !== 'GET' && (
        <div>
          <label className="block text-[10px] font-bold text-stone-400 mb-2 uppercase">Edit Request Body</label>
          <textarea 
            className="w-full h-32 p-3 font-mono text-xs bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-stone-400 uppercase">Response</label>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${response.status >= 200 && response.status < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <pre className="p-4 bg-stone-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-64">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
