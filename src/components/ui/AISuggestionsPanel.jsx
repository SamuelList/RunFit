import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function AISuggestionsPanel({ mapped = [], onApply = null }) {
  const { GEAR_INFO, setAiAppliedItems } = useAppContext();
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems((mapped || []).map((m) => ({ ...m, accepted: !!m.key })));
  }, [mapped]);

  const toggle = (idx) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, accepted: !it.accepted } : it));
  };

  const applySelected = () => {
    const keys = items.filter((it) => it.accepted && it.key).map((it) => it.key);
    setAiAppliedItems(keys);
    if (typeof onApply === 'function') onApply(keys);
  };

  const clearApplied = () => {
    setAiAppliedItems([]);
    if (typeof onApply === 'function') onApply([]);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">AI Suggestions</div>
          <div className="text-xs text-slate-500">Review and apply</div>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {items.length === 0 && (
            <div className="text-sm text-slate-500">No mapped suggestions yet.</div>
          )}
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8">
                  {it.key && GEAR_INFO[it.key] && GEAR_INFO[it.key].image ? (
                    <img src={GEAR_INFO[it.key].image} alt={it.name} className="h-8 w-8 rounded" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-700" />
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{it.name}</div>
                  <div className="text-xs text-slate-500">{it.key ? (GEAR_INFO[it.key]?.name || it.key) : 'Unmapped'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-400">{Math.round((it.confidence || 0) * 100)}%</div>
                <button onClick={() => toggle(idx)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm ${it.accepted ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  {it.accepted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {it.accepted ? 'Accepted' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={applySelected} disabled={items.filter(i => i.accepted && i.key).length === 0}>Apply Selected</Button>
          <Button variant="ghost" onClick={clearApplied}>Clear Applied</Button>
        </div>
      </div>
    </div>
  );
}
