/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  BadgePercent, 
  History, 
  Users, 
  FileText, 
  Send 
} from 'lucide-react';

interface QuickMenuProps {
  onSelectAction: (actionKey: string) => void;
}

export default function QuickMenu({ onSelectAction }: QuickMenuProps) {
  
  const menuItems = [
    {
      key: 'deposit',
      title: 'ডিপোজিট',
      subtitle: 'প্লায়ার অ্যাকাউন্ট',
      icon: ArrowUpRight,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      iconColor: 'text-emerald-700 bg-emerald-100/50',
      hoverColor: 'hover:bg-emerald-100/30 hover:border-emerald-200'
    },
    {
      key: 'withdraw',
      title: 'উইথড্র',
      subtitle: 'প্লায়ার ক্যাশআউট',
      icon: ArrowDownLeft,
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      iconColor: 'text-rose-700 bg-rose-100/50',
      hoverColor: 'hover:bg-rose-100/20 hover:border-rose-200'
    },
    {
      key: 'add_balance',
      title: 'ব্যালেন্স যুক্ত করুন',
      subtitle: 'টাকা রিকোয়েস্ট',
      icon: PlusCircle,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      iconColor: 'text-blue-700 bg-blue-100/60',
      hoverColor: 'hover:bg-blue-100/30 hover:border-blue-200'
    },
    {
      key: 'withdraw_commission',
      title: 'কমিশন উত্তোলন',
      subtitle: 'অর্জিত বোনাস নিন',
      icon: BadgePercent,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      iconColor: 'text-amber-700 bg-amber-100/60',
      hoverColor: 'hover:bg-amber-100/30 hover:border-amber-200'
    },
    {
      key: 'history',
      title: 'ট্রানজেকশন হিস্ট্রি',
      subtitle: 'লেনদেন তালিকা',
      icon: History,
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      iconColor: 'text-slate-700 bg-slate-200/50',
      hoverColor: 'hover:bg-slate-100 hover:border-slate-300'
    },
    {
      key: 'referral',
      title: 'রেফার কমিশন',
      subtitle: 'মেম্বার লিংক',
      icon: Users,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      iconColor: 'text-purple-700 bg-purple-100/50',
      hoverColor: 'hover:bg-purple-100/20 hover:border-purple-200'
    },
    {
      key: 'guide',
      title: 'নির্দেশিকা',
      subtitle: 'এজেন্ট গাইড',
      icon: FileText,
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      iconColor: 'text-teal-700 bg-teal-100/50',
      hoverColor: 'hover:bg-teal-100/20 hover:border-teal-200'
    },
    {
      key: 'support',
      title: 'টেলিগ্রাম সাপোর্ট',
      subtitle: '২৪/৭ গ্রাহক হেল্প',
      icon: Send,
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-100',
      iconColor: 'text-sky-700 bg-sky-100/50',
      hoverColor: 'hover:bg-sky-100/20 hover:border-sky-200'
    }
  ];

  return (
    <div className="w-full max-w-md px-4 mt-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
        কুইক মেনু (Quick Access)
      </h3>
      <div className="grid grid-cols-2 gap-3.5">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              type="button"
              id={`quick_btn_${item.key}`}
              key={item.key}
              onClick={() => onSelectAction(item.key)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left bg-white shadow-xs cursor-pointer transition-all duration-300 transform active:scale-[0.98] ${item.bgColor} ${item.borderColor} ${item.hoverColor}`}
            >
              <div className={`p-2 rounded-lg border border-transparent ${item.iconColor}`}>
                <IconComponent className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 tracking-tight font-sans leading-3">{item.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
