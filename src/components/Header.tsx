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
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  User, 
  RefreshCw,
  LogOut,
  ShieldCheck,
  Zap,
  UserCheck
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

  // Get agent short initial
  const getAgentInitial = (name: string) => {
    return name ? name.trim().charAt(0) : 'অ';
  };

  // Calculate percentage of limit used
  const depositLimitPercent = totalAgentDeposit > 0 ? Math.min(100, (agent.todayDeposit / totalAgentDeposit) * 100) : 0;
  const withdrawLimitPercent = totalAgentDeposit > 0 ? Math.min(100, (agent.todayWithdraw / totalAgentDeposit) * 100) : 0;

  return (
    <header className="relative w-full text-slate-800 flex flex-col items-center">
      {/* Top Banner: Elevated Profile Header */}
      <div className="w-full bg-white border-b border-slate-200/80 shadow-xs px-4 py-3 flex items-center justify-between gap-2">
        {/* Profile Card & Info */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 hover:bg-slate-50/80 p-1.5 rounded-2xl transition-all duration-300 text-left focus:outline-none focus:ring-0 group cursor-pointer max-w-[65%]"
          title="প্রোফাইল বিবরণী"
        >
          {/* Avatar Container */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white border border-blue-100 shadow-md shadow-blue-500/10 flex-shrink-0">
              <span className="text-base font-extrabold tracking-tight font-display">
                {getAgentInitial(agent.name)}
              </span>
            </div>
            {/* Live Indicator Dot */}
            <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
            </div>
          </div>

          {/* Name & ID labels with pristine typography */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-slate-850 truncate leading-tight tracking-tight group-hover:text-blue-700 transition">
                {agent.name}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" title="যাচাইকৃত এজেন্ট পোর্টাল" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9.5px] font-bold text-slate-400 font-mono tracking-wide">
                ID: {agent.id.toUpperCase()}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-[9px] font-extrabold text-blue-600 hover:underline">
                তথ্য এডিট
              </span>
            </div>
          </div>
        </button>

        {/* Action Controls - Standard aligned and highly polished */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Refresh Button */}
          <button 
            type="button"
            id="refresh_btn"
            onClick={handleRefresh}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-600 hover:text-slate-900 transition-all duration-200 active:scale-90 cursor-pointer shadow-3xs"
            title="সার্ভার ডাটা রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Notification Button */}
          <button 
            type="button"
            id="notif_bell_btn"
            onClick={onOpenNotifications}
            className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-600 hover:text-slate-900 transition-all duration-200 active:scale-90 cursor-pointer shadow-3xs"
            title="বিজ্ঞপ্তি প্যানেল"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 text-[9px] font-black rounded-lg flex items-center justify-center text-white border border-white shadow-xs animate-bounce">
                {toBanglaNum(unreadCount)}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button 
            type="button"
            id="logout_btn"
            onClick={onLogout}
            className="p-2 bg-rose-50/70 hover:bg-rose-100 border border-rose-150 rounded-xl text-rose-600 hover:text-rose-700 transition-all duration-200 active:scale-90 cursor-pointer shadow-3xs"
            title="লগআউট"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Agent Identity Card (Ultra-Premium Royal Sapphire Theme) */}
      <div className="w-full max-w-md px-4 mt-4">
        <div className="relative overflow-hidden w-full p-4.5 rounded-2xl bg-gradient-to-br from-[#1e40af] via-[#1a365d] to-[#0f172a] border border-blue-700/80 shadow-md shadow-blue-900/15">
          
          {/* Outer glowing ambient background circles */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

          {/* Wallet Header inside the Card */}
          <div className="flex justify-between items-center text-[10px] font-extrabold text-blue-200/90 tracking-wider">
            <span className="flex items-center gap-1 uppercase font-sans">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              মূল ওয়ালেট ব্যালেন্স
            </span>
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              <UserCheck className="w-2.5 h-2.5 text-blue-300" />
              <span className="text-[8.5px] font-bold text-blue-100 uppercase tracking-widest font-display">
                AUTHORIZED AGENT
              </span>
            </div>
          </div>

          {/* Tap to Reveal Balance Section */}
          <div className="flex items-center py-2 h-12 mt-1">
            <button
              type="button"
              id="toggle_balance_btn"
              onClick={() => setShowBalance(!showBalance)}
              className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-0 group cursor-pointer"
            >
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  {showBalance ? (
                    <motion.div
                      key="balance"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.12 }}
                      className="text-2xl font-black text-white tracking-tight font-display flex items-baseline gap-1"
                    >
                      ৳ {formatCurrency(agent.balance)} <span className="text-xs text-blue-200 font-bold">টাকা</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hidden"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.12 }}
                      className="flex items-center gap-1"
                    >
                      {/* Security placeholder dots */}
                      <div className="flex gap-1.5 items-center bg-white/10 border border-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-xl transition duration-200">
                        <span className="text-[10px] font-black text-blue-100 mr-1.5">ট্যাপ করুন</span>
                        <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse [animation-delay:0.15s]" />
                        <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse [animation-delay:0.3s]" />
                        <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse [animation-delay:0.45s]" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Eye Icon badge with premium glass styling */}
              <div className="p-2 bg-white/10 border border-white/15 rounded-xl group-hover:bg-white/20 transition text-blue-100 flex items-center justify-center shadow-3xs active:scale-95">
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </div>
            </button>
          </div>

          {/* Commission Balance row inside the Card with elegant accent split */}
          <div className="border-t border-white/10 pt-3 mt-1 flex justify-between items-center">
            <span className="text-blue-200/95 text-[10.5px] font-bold flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              কমিশন ব্যালেন্স
            </span>
            <button 
              type="button"
              id="toggle_comm_btn"
              onClick={() => setShowCommission(!showCommission)}
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition focus:outline-none cursor-pointer bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-2.5 py-0.5 rounded-lg active:scale-95"
            >
              {showCommission ? (
                <span className="font-mono text-[12px] font-black">৳ {formatCurrency(agent.commissionBalance)}</span>
              ) : (
                <span className="text-[10px] font-black border-b border-dotted border-amber-400/50">ব্যালেন্স দেখুন</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Today's Transactions Bento Cards */}
      <div className="w-full max-w-md px-4 mt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Today's Deposit */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-3xs flex flex-col gap-1.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              আজকের ডিপোজিট
            </span>
            <div className="flex flex-col mt-0.5">
              <span className="text-xs font-black text-slate-800 leading-none">
                ৳ {formatCurrency(agent.todayDeposit)}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-1">
                সীমাবদ্ধতা: ৳ {formatCurrency(totalAgentDeposit)}
              </span>
            </div>
            {/* Visual limit usage bar */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${depositLimitPercent}%` }} />
            </div>
          </div>

          {/* Today's Withdraw */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-3xs flex flex-col gap-1.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              আজকের উইথড্র
            </span>
            <div className="flex flex-col mt-0.5">
              <span className="text-xs font-black text-slate-800 leading-none">
                ৳ {formatCurrency(agent.todayWithdraw)}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-1">
                সীমাবদ্ধতা: ৳ {formatCurrency(totalAgentDeposit)}
              </span>
            </div>
            {/* Visual limit usage bar */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${withdrawLimitPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
