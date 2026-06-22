/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  BadgePercent, 
  Info,
  X 
} from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationCenter({
  notifications,
  onClose,
  onMarkAllRead,
  onClearAll,
  onMarkRead
}: NotificationCenterProps) {
  
  const toBanglaNum = (num: number) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toString()
      .split('')
      .map(char => {
        if (char >= '0' && char <= '9') {
          return banglaDigits[parseInt(char)];
        }
        return char;
      })
      .join('');
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${toBanglaNum(mins)} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${toBanglaNum(hours)} ঘণ্টা আগে`;
    return '১ দিন আগে';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
      case 'withdraw':
        return <ArrowDownLeft className="w-4 h-4 text-rose-600" />;
      case 'balance':
        return <PlusCircle className="w-4 h-4 text-blue-600" />;
      case 'commission':
        return <BadgePercent className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-sky-600" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-emerald-50 border-emerald-100';
      case 'withdraw':
        return 'bg-rose-50 border-rose-100';
      case 'balance':
        return 'bg-blue-50 border-blue-100';
      case 'commission':
        return 'bg-amber-50 border-amber-100';
      default:
        return 'bg-sky-50 border-sky-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, x: 200 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 200 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-md h-full flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl relative overflow-hidden"
      >
        {/* Banner header */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-150">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100 shadow-3xs">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">ইনস্ট্যান্ট নোটিফিকেশন</h3>
              <p className="text-[10px] text-slate-500">অটোমেটিক আপডেট এলার্ট</p>
            </div>
          </div>
          <button
            type="button"
            id="close_notif_panel_btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        {notifications.length > 0 && (
          <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-slate-150 text-xs shadow-3xs">
            <button
              type="button"
              id="mark_all_read_btn"
              onClick={onMarkAllRead}
              className="text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
            >
              সব পঠিত মার্ক করুন
            </button>
            <button
              type="button"
              id="clear_all_notif_btn"
              onClick={onClearAll}
              className="text-slate-500 hover:text-rose-600 font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              সব মুছে ফেলুন
            </button>
          </div>
        )}

        {/* Notifications Scroll */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3.5 bg-slate-50/20">
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 shadow-2xs">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">কোন নোটিফিকেশন নেই</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">সব লেনদেন ও অ্যাক্টিভিটি নোটিফিকেশন এখানে পাবেন।</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  id={`notif_item_${notif.id}`}
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => onMarkRead(notif.id)}
                  className={`p-3.5 rounded-xl border flex gap-3 transition-colors duration-200 cursor-pointer ${
                    notif.read 
                      ? 'bg-white border-slate-200/60 text-slate-500' 
                      : 'bg-blue-50/45 border-blue-150/80 text-slate-800 hover:bg-blue-50/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg border flex-shrink-0 h-fit ${getIconBg(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-xs font-bold ${notif.read ? 'text-slate-600' : 'text-slate-800'}`}>
                        {notif.title}
                      </span>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">
                        {getRelativeTime(notif.timestamp)}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${notif.read ? 'text-slate-500' : 'text-slate-700'}`}>
                      {notif.body}
                    </p>
                    {!notif.read && (
                      <span className="text-[9px] font-bold text-blue-600 mt-1.5 flex items-center gap-1">
                        ● অপঠিত (পড়তে ট্যাপ করুন)
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
