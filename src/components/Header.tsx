/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Coins, 
  Eye, 
  EyeOff, 
  Bell, 
  Wifi, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  User, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import { Agent } from '../types';

interface HeaderProps {
  agent: Agent;
  unreadCount: number;
  onOpenNotifications: () => void;
  isFirebaseSynced: boolean;
  onRefreshData: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  totalAgentDeposit?: number;
}

export default function Header({ 
  agent, 
  unreadCount, 
  onOpenNotifications, 
  isFirebaseSynced, 
  onRefreshData,
  onOpenProfile,
  onLogout,
  totalAgentDeposit = 0,
}: HeaderProps) {
  const [showBalance, setShowBalance] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

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

  return (
    <header className="relative w-full text-slate-800 flex flex-col items-center">
      {/* Top Banner: Status & Notifications */}
      <div className="w-full flex justify-between items-center px-5 py-4 bg-white border-b border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition cursor-pointer text-left focus:outline-none focus:ring-0"
          title="প্রোফাইল দেখুন ও এডিট করুন"
        >
          <div className="relative w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
            <User className="w-5 h-5 text-blue-600" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white pulse-live"></div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 tracking-tight leading-4 hover:text-blue-700 transition">
              {agent.name}
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
              <span>ID: {agent.id.toUpperCase()}</span>
              <span>•</span>
              <span className="text-blue-600 font-sans font-medium hover:underline">তথ্য এডিট করুন</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            id="refresh_btn"
            onClick={handleRefresh}
            className="p-2 bg-slate-55 border border-slate-200 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button 
            type="button"
            id="notif_bell_btn"
            onClick={onOpenNotifications}
            className="relative p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-full text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            title="বিজ্ঞপ্তি সমূহ"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-[10px] font-bold rounded-full flex items-center justify-center text-white scale-90 border border-white">
                {toBanglaNum(unreadCount)}
              </span>
            )}
          </button>

          <button 
            type="button"
            id="logout_btn"
            onClick={onLogout}
            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-150 hover:border-rose-300 rounded-full text-rose-600 hover:text-rose-700 transition active:scale-95 cursor-pointer flex items-center justify-center"
            title="লগআউট (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Agent Identity Card (Professional Polish Sapphire Theme) */}
      <div className="w-full max-w-md px-4 mt-5">
        <div className="relative overflow-hidden w-full p-5 rounded-2xl bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#172554] border border-blue-700 shadow-xl shadow-blue-900/10">
          
          {/* Subtle logo vector background */}
          <div className="absolute right-0 bottom-0 translate-x-5 translate-y-5 opacity-8 pointer-events-none">
            <Wallet className="w-44 h-44 text-blue-400" />
          </div>

          <div className="flex flex-col gap-3">
            {/* Wallet header */}
            <div className="flex justify-between items-center text-[11px] font-semibold text-blue-200 tracking-wider">
              <span className="flex items-center gap-1.5 uppercase font-display">
                <Wallet className="w-3.5 h-3.5 text-blue-300" />
                মেইন ব্যালেন্স
              </span>
              <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-blue-100 font-mono uppercase tracking-wide">
                Agent Wallet
              </span>
            </div>

            {/* Tap to Reveal Balance (Interactive Mobile UI classic feature) */}
            <div className="flex items-center py-2 h-14">
              <button
                type="button"
                id="toggle_balance_btn"
                onClick={() => setShowBalance(!showBalance)}
                className="w-full flex items-center gap-3 text-left focus:outline-none focus:ring-0 group cursor-pointer"
              >
                <div className="relative flex-1">
                  <AnimatePresence mode="wait">
                    {showBalance ? (
                      <motion.div
                        key="balance"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="text-2xl font-bold text-white tracking-wide font-display flex items-baseline gap-1"
                      >
                        ৳ {formatCurrency(agent.balance)} <span className="text-xs text-blue-200 font-normal">টাকা</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hidden"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="h-8 flex items-center bg-white/10 rounded-full px-4 border border-white/20 w-fit hover:bg-white/15 transition duration-200"
                      >
                        <span className="text-xs font-semibold text-blue-100 mr-2">ব্যালেন্স দেখতে ট্যাপ করুন</span>
                        <div className="flex gap-1.5 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse [animation-delay:0.2s]"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse [animation-delay:0.4s]"></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="p-2 bg-white/10 border border-white/10 rounded-lg group-hover:bg-white/20 transition text-blue-100">
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
              </button>
            </div>

            {/* Split dividers */}
            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
              <span className="text-blue-200/80 text-xs flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                কমিশন ব্যালেন্স
              </span>
              <button 
                type="button"
                id="toggle_comm_btn"
                onClick={() => setShowCommission(!showCommission)}
                className="flex items-center gap-1.5 hover:text-white transition group focus:outline-none cursor-pointer"
              >
                {showCommission ? (
                  <span className="font-mono text-sm font-semibold text-amber-300">৳ {formatCurrency(agent.commissionBalance)}</span>
                ) : (
                  <span className="text-xs text-blue-200/70 border-b border-dotted border-blue-300/60 group-hover:text-amber-300 group-hover:border-amber-300 transition">কমিশন দেখুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Transactions Summary ("আজকের লেনদেন") */}
      <div className="w-full max-w-md px-4 mt-4">
        <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col gap-1 border-r border-slate-100 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              আজকের ডিপোজিট (Dep)
            </span>
            <span className="text-base font-bold text-slate-800 flex items-baseline gap-1 mt-0.5 flex-wrap">
              <span>৳ {formatCurrency(agent.todayDeposit)}</span>
              <span className="text-[10px] text-slate-400 font-normal">/ ৳{formatCurrency(totalAgentDeposit)}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1 pl-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              আজকের উইথড্র (With)
            </span>
            <span className="text-base font-bold text-slate-800 flex items-baseline gap-1 mt-0.5 flex-wrap">
              <span>৳ {formatCurrency(agent.todayWithdraw)}</span>
              <span className="text-[10px] text-slate-400 font-normal">/ ৳{formatCurrency(totalAgentDeposit)}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
