/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, Agent } from '../types';

interface HistoryTrackerProps {
  transactions: Transaction[];
  agent: Agent;
}

export default function HistoryTracker({ transactions, agent }: HistoryTrackerProps) {
  // Default to yesterday's date in YYYY-MM-DD local format
  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayDateString());

  // Convert English number to Bengali number helper
  const toBanglaNum = (strOrNum: string | number) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return strOrNum
      .toString()
      .split('')
      .map(char => {
        if (char >= '0' && char <= '9') {
          return banglaDigits[parseInt(char)];
        }
        if (char === '.') return '.';
        if (char === ',') return ',';
        return char;
      })
      .join('');
  };

  // Format currency with comma separations
  const formatCurrency = (num: number) => {
    return toBanglaNum(num.toLocaleString('bn-BD'));
  };

  // Convert Gregorian date string to readable Bengali format (e.g. ২৫ জুন, ২০২৬)
  const formatBengaliDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const monthsBengali = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    return `${toBanglaNum(day)} ${monthsBengali[month - 1]}, ${toBanglaNum(year)}`;
  };

  // Calculate stats for the selected date
  const stats = useMemo(() => {
    if (!selectedDate) {
      return { deposit: 0, withdraw: 0, commission: 0, count: 0 };
    }

    const [year, month, day] = selectedDate.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    const filtered = transactions.filter(t => {
      const isAgentMatch = t.agentId === agent.id || (!t.agentId && agent.id === 'default_agent');
      return isAgentMatch && t.status === 'completed' && t.timestamp >= start && t.timestamp <= end;
    });

    const deposit = filtered
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const withdraw = filtered
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);

    const commission = filtered
      .reduce((sum, t) => sum + t.comAmount, 0);

    return {
      deposit,
      withdraw,
      commission,
      count: filtered.length
    };
  }, [selectedDate, transactions, agent.id]);

  // Adjust date by offset in days
  const adjustDate = (daysOffset: number) => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    current.setDate(current.getDate() + daysOffset);
    
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  return (
    <div className="w-full max-w-md px-4 mt-2" id="history_tracker_container">
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex flex-col gap-2 font-sans">
        
        {/* Header with compact Date Selector */}
        <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-200/60">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">পূর্বের হিসাব</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustDate(-1)}
              className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600 cursor-pointer active:scale-95"
              title="পূর্ববর্তী দিন"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            {/* Space-saving interactive date badge */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              />
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9.5px] font-bold text-slate-700 flex items-center gap-1 hover:border-slate-350 transition">
                📅 {formatBengaliDate(selectedDate)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => adjustDate(1)}
              className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600 cursor-pointer active:scale-95"
              title="পরবর্তী দিন"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                setSelectedDate(`${y}-${m}-${d}`);
              }}
              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-lg text-[8.5px] font-extrabold text-slate-650 transition cursor-pointer"
            >
              আজ
            </button>
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* Deposit */}
          <div className="flex flex-col p-1.5 rounded-lg bg-white border border-slate-150 shadow-3xs">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
              ডিপোজিট
            </span>
            <span className="text-[11px] font-extrabold text-slate-700 mt-0.5 leading-none">
              ৳ {formatCurrency(stats.deposit)}
            </span>
          </div>

          {/* Withdraw */}
          <div className="flex flex-col p-1.5 rounded-lg bg-white border border-slate-150 shadow-3xs">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-0.5">
              <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
              উইথড্র
            </span>
            <span className="text-[11px] font-extrabold text-slate-700 mt-0.5 leading-none">
              ৳ {formatCurrency(stats.withdraw)}
            </span>
          </div>

          {/* Commission */}
          <div className="flex flex-col p-1.5 rounded-lg bg-amber-50/70 border border-amber-150 shadow-3xs">
            <span className="text-[8px] font-black text-amber-700 uppercase tracking-wide flex items-center gap-0.5">
              <Coins className="w-2.5 h-2.5 text-amber-500" />
              কমিশন
            </span>
            <span className="text-[11px] font-black text-amber-700 mt-0.5 leading-none">
              ৳ {formatCurrency(stats.commission)}
            </span>
          </div>
        </div>

        {/* Count and metadata Footer */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-semibold px-0.5">
          <span>মোট সম্পন্ন কাজ: {toBanglaNum(stats.count)} টি</span>
          <span className="text-slate-400 font-medium">৩% DEP, ২% WITH কমিশন</span>
        </div>

      </div>
    </div>
  );
}
