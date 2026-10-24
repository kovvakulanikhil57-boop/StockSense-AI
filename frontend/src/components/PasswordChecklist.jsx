import React from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordChecklist({ password }) {
  const rules = [
    { label: 'At least 8 characters', valid: (password || '').length >= 8 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(password || '') },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(password || '') },
    { label: 'One digit (0-9)', valid: /[0-9]/.test(password || '') },
    { label: 'One special symbol (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || '') },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600">
      <div className="font-semibold text-slate-700 mb-1">Password Strength Requirements:</div>
      {rules.map((rule, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {rule.valid ? (
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
              <X className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
          <span className={rule.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}
