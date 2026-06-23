/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  BadgePercent, 
  History, 
  Users, 
  FileText, 
  Send,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Copy,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Upload,
  Wallet,
  Share2,
  User,
  Lock,
  Mail,
  Calendar,
  Smartphone,
  Trash2,
  Check
} from 'lucide-react';
import { Transaction, BalanceRequest, CommissionWithdrawal, Agent, PlayerRequest } from '../types';

interface ModalProps {
  type: string;
  onClose: () => void;
  agent: Agent;
  transactions: Transaction[];
  balanceRequests: BalanceRequest[];
  commissionWithdrawals: CommissionWithdrawal[];
  onSubmitDeposit: (playerId: string, playerName: string, amount: number, method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', comPercent: number) => void;
  onSubmitWithdraw: (playerId: string, playerName: string, amount: number, method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', comPercent: number) => void;
  onSubmitBalanceRequest: (amount: number, method: 'bKash' | 'Nagad' | 'Rocket' | 'Bank', senderNumber: string, txid: string, agentId?: string, screenshotUrl?: string) => string;
  onSubmitCommissionWithdrawal: (amount: number, method: 'main_balance' | 'mobile_banking', mobileMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', receiverNum?: string) => void;
  playerRequests?: PlayerRequest[];
  onResolvePlayerRequest?: (id: string, status: 'approved' | 'rejected') => void;
  timeLeft?: number;
  onTriggerPlayerRequest?: (manualType?: 'deposit' | 'withdraw') => void;
  onUpdateProfile?: (updatedFields: Partial<Agent>) => void;
  onDeleteTransaction?: (txId: string) => void;
}

interface ModalContainerProps {
  title: string;
  onClose: () => void;
  errorMsg?: string;
  successMsg?: string;
  children: React.ReactNode;
}

const ModalContainer = ({ title, onClose, errorMsg, successMsg, children }: ModalContainerProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Modal Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-150 bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-850 flex items-center gap-2">
          {title}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Scrollable Content Container */}
      <div className="p-5 overflow-y-auto no-scrollbar flex-1">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-255 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 animate-bounce text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {children}
      </div>
    </motion.div>
  </div>
);

export default function Modals({
  type,
  onClose,
  agent,
  transactions,
  balanceRequests,
  commissionWithdrawals,
  onSubmitDeposit,
  onSubmitWithdraw,
  onSubmitBalanceRequest,
  onSubmitCommissionWithdrawal,
  playerRequests = [],
  onResolvePlayerRequest = () => {},
  timeLeft = 60,
  onTriggerPlayerRequest = () => {},
  onUpdateProfile = () => {},
  onDeleteTransaction = () => {}
}: ModalProps) {

  // Translate english numbers to Bengali
  const toBanglaNum = (strOrNum: string | number) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return strOrNum
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

  const formatCurrency = (num: number) => {
    return toBanglaNum(num.toLocaleString('bn-BD'));
  };

  // Real limits and quotas based on agent deposits (system recharges)
  const totalAgentDeposit = balanceRequests
    .filter(r => r.status === 'approved' && (r.agentId === agent.id || (!r.agentId && agent.id === 'default_agent')))
    .reduce((sum, r) => sum + r.amount, 0);

  const totalApprovedPlayerDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed' && (t.agentId === agent.id || (!t.agentId && agent.id === 'default_agent')))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalApprovedPlayerWithdraws = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'completed' && (t.agentId === agent.id || (!t.agentId && agent.id === 'default_agent')))
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingDepositLimit = Math.max(0, totalAgentDeposit - totalApprovedPlayerDeposits);
  const remainingWithdrawLimit = Math.max(0, totalAgentDeposit - totalApprovedPlayerWithdraws);

  // State for forms
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Profile form states
  const [profileName, setProfileName] = useState(agent.name);
  const [profilePhone, setProfilePhone] = useState(agent.phone);
  const [profileEmail, setProfileEmail] = useState(agent.email || '');
  const [profileDob, setProfileDob] = useState(agent.dob || '');
  const [profilePassword, setProfilePassword] = useState(agent.password || '');
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    if (type === 'profile') {
      setProfileName(agent.name);
      setProfilePhone(agent.phone);
      setProfileEmail(agent.email || '');
      setProfileDob(agent.dob || '');
      setProfilePassword(agent.password || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [type, agent]);

  // Selected player request for live interactive workflow
  const [selectedPlayerReq, setSelectedPlayerReq] = useState<PlayerRequest | null>(null);
  const [resolvedReceipt, setResolvedReceipt] = useState<{ req: PlayerRequest; status: 'approved' | 'rejected'; timestamp: number } | null>(null);

  const downloadReceiptTxt = (req: PlayerRequest, status: 'approved' | 'rejected') => {
    const isApproved = status === 'approved';
    const comAmount = req.amount * (req.type === 'deposit' ? 0.015 : 0.01);
    const text = `
==============================================
             AGENT PAY PAYMENT RECEIPT
==============================================
Receipt Date  : ${new Date().toLocaleString('en-US')}
Transaction   : ${req.type.toUpperCase()}
Request ID    : ${req.id}
Agent ID      : ${agent.id}
Agent Name    : ${agent.name}
----------------------------------------------
Player ID     : ${req.playerId}
Website       : ${req.siteName}
Amount        : BDT ${req.amount.toLocaleString()}
Payment Port  : ${req.paymentMethod}
Sender Account: ${req.senderNumber}
TxID / TrxNum : ${req.txid || 'N/A'}
----------------------------------------------
COMMISSION INFO:
Rate %        : ${req.type === 'deposit' ? '1.5%' : '1.0%'}
Commission BDT: BDT ${comAmount.toLocaleString()}
----------------------------------------------
STATUS        : ${status.toUpperCase()} (SUCCESSFULLY COMPLETED)
==============================================
        Thank you for choosing Agent Pay!
==============================================
`;
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Receipt_${req.id}_${req.type}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Players database mock lookups to look extremely professional
  useEffect(() => {
    if (playerId === 'PL-99805' || playerId === '99805') {
      setPlayerName('শাকিব হাসান');
    } else if (playerId === 'PL-45091' || playerId === '45091') {
      setPlayerName('তামিম ইকবাল');
    } else if (playerId === 'PL-23315' || playerId === '23315') {
      setPlayerName('মুশফিকুর রহিম');
    } else if (playerId === 'PL-33012' || playerId === '33012') {
      setPlayerName('মাহমুদুল্লাহ রিয়াদ');
    } else if (playerId.length > 4 && playerName === '') {
      setPlayerName('খেলোয়াড় ' + playerId.slice(-3));
    }
  }, [playerId]);

  // Limits utilities
  const defaultLimits = {
    dailyDeposit: 50000,
    weeklyDeposit: 250000,
    monthlyDeposit: 1000000,
    dailyWithdraw: 50000,
    weeklyWithdraw: 250000,
    monthlyWithdraw: 1000000,
  };

  const limits = agent.limits || defaultLimits;

  const getAgentAccumulated = (type: 'deposit' | 'withdraw', period: 'day' | 'week' | 'month') => {
    const now = Date.now();
    let cutoff = 0;
    if (period === 'day') {
      const d = new Date();
      d.setHours(0,0,0,0);
      cutoff = d.getTime();
    } else if (period === 'week') {
      cutoff = now - (7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      cutoff = now - (30 * 24 * 60 * 60 * 1000);
    }

    return transactions
      .filter(t => t.type === type && t.status === 'completed' && (t.agentId === agent.id || (!t.agentId && agent.id === 'default_agent')) && t.timestamp >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(amountInput);
    if (!playerId) return setErrorMsg('খেলোয়াড় আইডি অবশ্যই দিতে হবে!');
    if (!money || money <= 0) return setErrorMsg('সঠিক টাকার পরিমাণ প্রবেশ করান!');
    if (money > agent.balance) return setErrorMsg('আপনার পরিমিত ব্যালেন্স নেই! ব্যালেন্স রিচার্জ করুন।');
    
    // Check Limits
    const dailyUsed = getAgentAccumulated('deposit', 'day');
    const weeklyUsed = getAgentAccumulated('deposit', 'week');
    const monthlyUsed = getAgentAccumulated('deposit', 'month');

    if (dailyUsed + money > limits.dailyDeposit) {
      return setErrorMsg(`দৈনিক ডিপোজিট সীমা অতিক্রম করেছে! আপনার আজকের অবশিষ্ট সীমা: ৳ ${(limits.dailyDeposit - dailyUsed).toLocaleString('bn-BD')} টাকা।`);
    }
    if (weeklyUsed + money > limits.weeklyDeposit) {
      return setErrorMsg(`সাপ্তাহিক ডিপোজিট সীমা অতিক্রম করেছে! আপনার সাপ্তাহিক অবশিষ্ট সীমা: ৳ ${(limits.weeklyDeposit - weeklyUsed).toLocaleString('bn-BD')} টাকা।`);
    }
    if (monthlyUsed + money > limits.monthlyDeposit) {
      return setErrorMsg(`মাসিক ডিপোজিট সীমা অতিক্রম করেছে! আপনার মাসিক অবশিষ্ট সীমা: ৳ ${(limits.monthlyDeposit - monthlyUsed).toLocaleString('bn-BD')} টাকা।`);
    }

    // Calculate Commission: Default 3% for deposit
    onSubmitDeposit(playerId, playerName || 'নামহীন খেলোয়াড়', money, method, 3.0);
    setSuccessMsg('ডিপোজিট সফলভাবে সম্পন্ন হয়েছে!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(amountInput);
    if (!playerId) return setErrorMsg('খেলোয়াড় আইডি দিতে হবে!');
    if (!money || money <= 0) return setErrorMsg('টাকার সঠিক পরিমাণ লিখুন!');
    
    // Check Limits
    const dailyUsed = getAgentAccumulated('withdraw', 'day');
    const weeklyUsed = getAgentAccumulated('withdraw', 'week');
    const monthlyUsed = getAgentAccumulated('withdraw', 'month');

    if (dailyUsed + money > limits.dailyWithdraw) {
      return setErrorMsg(`দৈনিক উইথড্র সীমা অতিক্রম করেছে! আপনার আজকের অবশিষ্ট সীমা: ৳ ${(limits.dailyWithdraw - dailyUsed).toLocaleString('bn-BD')} টাকা।`);
    }
    if (weeklyUsed + money > limits.weeklyWithdraw) {
      return setErrorMsg(`সাপ্তাহিক উইথড্র সীমা অতিক্রম করেছে! আপনার সাপ্তাহিক অবশিষ্ট সীমা: ৳ ${(limits.weeklyWithdraw - weeklyUsed).toLocaleString('bn-BD')} টাকা।`);
    }
    if (monthlyUsed + money > limits.monthlyWithdraw) {
      return setErrorMsg(`মাসিক উইথড্র সীমা অতিক্রম করেছে! আপনার মাসিক অবশিষ্ট সীমা: ৳ ${(limits.monthlyWithdraw - monthlyUsed).toLocaleString('bn-BD')} টাকা।`);
    }

    // Calculate Commission: Default 2% for Withdrawals
    onSubmitWithdraw(playerId, playerName || 'নামহীন খেলোয়াড়', money, method, 2.0);
    setSuccessMsg('উইথড্রয়াল সফলভাবে সম্পন্ন হয়েছে!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleProfileUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return setErrorMsg('নাম খালি রাখা যাবে না!');
    if (!profilePhone.trim()) return setErrorMsg('মোবাইল নাম্বার খালি রাখা যাবে না!');
    
    onUpdateProfile({
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      dob: profileDob,
      password: profilePassword
    });

    setSuccessMsg('আপনার প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Add Balance Request state
  const [balanceStep, setBalanceStep] = useState(1);
  const [reqMethod, setReqMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [customAgentId, setCustomAgentId] = useState(agent.id || 'default_agent');
  const [senderNumber, setSenderNumber] = useState('');
  const [txid, setTxid] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [generatedReqId, setGeneratedReqId] = useState('');
  const [screenshotUploading, setScreenshotUploading] = useState(false);

  // Compressed Base64 Image Generator
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          setScreenshotUrl(compressedBase64);
        } else {
          setScreenshotUrl(event.target?.result as string || '');
        }
        setScreenshotUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleBalanceStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(amountInput);
    if (!customAgentId.trim()) return setErrorMsg('এজেন্ট আইডি অবশ্যই দিতে হবে!');
    if (!money || money <= 0) return setErrorMsg('টাকার সঠিক পরিমাণ লিখুন!');
    
    setErrorMsg('');
    setBalanceStep(2);
  };

  const handleBalanceStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(amountInput);
    if (!senderNumber.trim()) return setErrorMsg('প্রেরকের মোবাইল নাম্বার দিন!');
    if (!txid.trim()) return setErrorMsg('ট্রানজেকশন আইডি (TxID) পূরণ করুন!');

    const reqId = onSubmitBalanceRequest(money, reqMethod, senderNumber, txid, customAgentId, screenshotUrl);
    setGeneratedReqId(reqId);
    
    setSuccessMsg('ব্যালেন্স রিকোয়েস্ট সফলভাবে জমা হয়েছে!');
    setTimeout(() => {
      setSuccessMsg('');
      setBalanceStep(3);
    }, 1200);
  };

  // Commission Withdrawal States
  const [commissionStep, setCommissionStep] = useState(1);
  const [commAmountValue, setCommAmountValue] = useState(0);
  const [commMethod, setCommMethod] = useState<'main_balance' | 'mobile_banking'>('main_balance');
  const [commMobileMethod, setCommMobileMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [receiverNumber, setReceiverNumber] = useState('');

  const handleCommissionWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const money = parseFloat(amountInput);
    if (!money || money <= 0) return setErrorMsg('সঠিক পরিমাণ টাকার সংখ্যা লিখুন!');
    if (money > agent.commissionBalance) return setErrorMsg('আপনার উপার্জিত কমিশন ফান্ডে পর্যাপ্ত টাকা নেই!');
    
    if (commMethod === 'mobile_banking' && !receiverNumber) {
      return setErrorMsg('মোবাইল ব্যাংকিং রিসিভার নম্বর দিতে হবে!');
    }

    onSubmitCommissionWithdrawal(money, commMethod, commMobileMethod, receiverNumber);
    setCommAmountValue(money);
    
    if (commMethod === 'mobile_banking') {
      setSuccessMsg('কমিশন উত্তোলন রিকোয়েস্ট তৈরি করা হয়েছে!');
    } else {
      setSuccessMsg('কমিশন মেইন ব্যালেন্সে কনভার্ট করা হয়েছে!');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setCommissionStep(2);
    }, 1200);
  };

  // History filtering states
  const [historyType, setHistoryType] = useState<'all' | 'deposit' | 'withdraw' | 'balance_add' | 'commission_withdraw'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = transactions.filter(t => {
    let matchesType = false;
    const tType = t.type as string;
    if (historyType === 'all') {
      matchesType = true;
    } else if (historyType === 'deposit') {
      matchesType = tType === 'deposit' || tType === 'deposit_rejected' || tType === 'deposit_cancelled';
    } else if (historyType === 'withdraw') {
      matchesType = tType === 'withdraw' || tType === 'withdraw_rejected' || tType === 'withdraw_cancelled';
    } else if (historyType === 'balance_add') {
      matchesType = tType === 'balance_add' || tType === 'balance_rejected';
    } else if (historyType === 'commission_withdraw') {
      matchesType = tType === 'commission_withdraw';
    }

    const matchesSearch = (t.playerId || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.playerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AnimatePresence>
      {/* 1. DEPOSIT MODAL */}
      {type === 'deposit' && (
        <ModalContainer title="খেলায়াড় ডিপোজিট নোটিফিকেশন পুল" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-4">
            
            {/* 1.1 PAYMENT RECEIPT DISPLAY */}
            {resolvedReceipt && resolvedReceipt.req.type === 'deposit' ? (
              <div className="flex flex-col gap-3 font-sans">
                <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl text-center flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                  <h4 className="text-sm font-bold text-emerald-800">ডিপোজিট লেনদেন সফল!</h4>
                  <p className="text-[10px] text-emerald-600 font-medium">রসিদ সেশনের জন্য সংরক্ষণ করা হল</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[11px] font-mono leading-relaxed space-y-1">
                  <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">== AGENT PAY RECEIPT ==</div>
                  <div>অনুরোধ আইডি: {resolvedReceipt.req.id}</div>
                  <div>তারিখ ও সময়: {new Date(resolvedReceipt.timestamp).toLocaleString('bn-BD')}</div>
                  <div>প্লেয়ার আইডি: {resolvedReceipt.req.playerId}</div>
                  <div>বেটিং সাইট: {resolvedReceipt.req.siteName}</div>
                  <div>পরিমাণ: ৳{resolvedReceipt.req.amount.toLocaleString('bn-BD')} টাকা</div>
                  <div>পেমেন্ট মেথড: {resolvedReceipt.req.paymentMethod}</div>
                  <div>গ্রাহক নম্বর: {resolvedReceipt.req.senderNumber}</div>
                  <div>ট্রানজেকশন আইডি: {resolvedReceipt.req.txid}</div>
                  <div className="pt-2 border-t border-dashed border-slate-300">কমিশন (৩.০%): BDT {(resolvedReceipt.req.amount * 0.03).toLocaleString('bn-BD')} টাকা</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => downloadReceiptTxt(resolvedReceipt.req, resolvedReceipt.status)}
                    className="py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    রসিদ ডাউনলোড করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResolvedReceipt(null); setSelectedPlayerReq(null); }}
                    className="py-2 rounded-xl border border-slate-250 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    নতুন অনুরোধ দেখুন
                  </button>
                </div>
              </div>
            ) : selectedPlayerReq && selectedPlayerReq.type === 'deposit' ? (
              
              /* 1.2 VIEW SINGLE DEPOSIT REQUEST DETAILS */
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="flex items-center justify-between border-b pb-2 border-slate-150">
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerReq(null)}
                    className="text-blue-700 hover:text-blue-800 font-bold"
                  >
                    ← ফিরে যান
                  </button>
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">{selectedPlayerReq.id}</span>
                </div>

                <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-sm font-bold border-b pb-2 border-slate-100">
                    <span className="text-slate-500">বেটিং ওয়েবসাইট</span>
                    <span className="text-blue-700 font-extrabold uppercase">{selectedPlayerReq.siteName}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">প্লেয়ার আইডি/Username</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">{selectedPlayerReq.playerId}</span>
                  </div>

                  <div className="flex justify-between items-center text-base font-extrabold">
                    <span className="text-slate-500 text-xs">ডিপোজিট পরিমাণ</span>
                    <span className="text-slate-900">৳{selectedPlayerReq.amount.toLocaleString('bn-BD')} টাকা</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পেমেন্ট গেটওয়ে</span>
                    <span className="font-bold text-slate-700 uppercase bg-slate-200 px-2 py-0.5 rounded-sm">{selectedPlayerReq.paymentMethod}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">যে নম্বর থেকে টাকা পাঠিয়েছে</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedPlayerReq.senderNumber}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ট্রানজেকশন আইডি (TxID)</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">{selectedPlayerReq.txid}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-150/60 text-[10px]">
                    <span className="text-slate-400">চার্জিং কমিশন (৩.০%):</span>
                    <span className="font-bold text-emerald-600">+ ৳{(selectedPlayerReq.amount * 0.03).toLocaleString('bn-BD')} টাকা</span>
                  </div>
                </div>

                {/* Deposit Quota limit diagnostics screen */}
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col gap-1 text-[11px]">
                  <span className="font-bold text-amber-900">🔔 ডিপোজিট-ভিত্তিক এপ্রুভাল সীমা পর্যবেক্ষণঃ</span>
                  <div className="flex justify-between mt-1 text-slate-600">
                    <span>মোট এডমিন ডিপোজিট (জমা):</span>
                    <span className="font-bold">৳{totalAgentDeposit.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>এপর্যন্ত সফল ডিপোজিট এপ্রুভালঃ</span>
                    <span className="font-bold text-blue-600">৳{totalApprovedPlayerDeposits.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200/50 pt-1 font-semibold text-slate-800">
                    <span>অবशिष्ट ডিপোজিট এপ্রুভাল সীমাঃ</span>
                    <span className={`${remainingDepositLimit > 0 ? 'text-emerald-700' : 'text-slate-500'} font-bold`}>৳{remainingDepositLimit.toLocaleString('bn-BD')} টাকা</span>
                  </div>
                </div>

                {selectedPlayerReq.amount > remainingDepositLimit && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl leading-relaxed font-medium">
                    ⚠️ <strong>অনুমোদন ব্লক করা হয়েছে:</strong> আপনার অবশিষ্ট ডিপোজিটের এপ্রুভাল সীমা পর্যাপ্ত নয়। এপ্রুভাল সীমা বাড়ানোর জন্য দয়া করে অ্যাডমিন ড্যাশবোর্ডে নতুন রিচার্জ (জমা) অনুরোধ পাঠিয়ে এপ্রুভ করিয়ে নিন।
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-150 rounded-xl p-3 text-[10.5px] leading-relaxed text-blue-800">
                  ℹ️ নিশ্চিত হওয়ার পর <strong>এপ্রুভ করুন</strong> বাটনে চাপ দিন। আপনার লেজার ব্যালেন্স থেকে ৳{selectedPlayerReq.amount.toLocaleString('bn-BD')} টাকা বিয়োগ হবে এবং ২ সেকেন্ডে ৩.০% কমিশন লেজারে ক্রেডিট হয়ে যাবে।
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onResolvePlayerRequest(selectedPlayerReq.id, 'rejected');
                      setResolvedReceipt({ req: selectedPlayerReq, status: 'rejected', timestamp: Date.now() });
                    }}
                    className="py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold cursor-pointer"
                  >
                    অনুরোধ বাতিল করুন
                  </button>
                  <button
                    type="button"
                    disabled={selectedPlayerReq.amount > remainingDepositLimit}
                    onClick={() => {
                      if (agent.balance < selectedPlayerReq.amount) {
                        setErrorMsg('আপনার মেইন ব্যালেন্স অপর্যাপ্ত! অনুগ্রহ করে আগে অ্যাডমিন গেটওয়েতে রিচার্জ করুন।');
                        return;
                      }
                      onResolvePlayerRequest(selectedPlayerReq.id, 'approved');
                      setResolvedReceipt({ req: selectedPlayerReq, status: 'approved', timestamp: Date.now() });
                    }}
                    className={`py-2.5 rounded-xl text-white font-bold shadow-xs transition leading-normal ${
                      selectedPlayerReq.amount > remainingDepositLimit 
                        ? 'bg-slate-350 cursor-not-allowed opacity-50' 
                        : 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                    }`}
                  >
                    এপ্রুভ করুন (৳{selectedPlayerReq.amount.toLocaleString('bn-BD')})
                  </button>
                </div>
              </div>
            ) : (
              
              /* 1.3 SHOW LIST OF ALL PENDING DEPOSITS */
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-150 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-blue-900 text-xs">ডিপোজিট রিফ্রেশ ক্যু</h5>
                    <span className="text-[10px] text-blue-700">পরবর্তী স্বয়ংক্রিয় অনুরোধঃ <strong className="font-mono text-xs">{timeLeft}</strong> সেকেন্ড</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerPlayerRequest('deposit')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-bold transition shadow-2xs cursor-pointer active:scale-97"
                  >
                    ⚡ অনুরোধ আনুন
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto no-scrollbar font-sans pr-0.5">
                  {playerRequests.filter(r => r.type === 'deposit' && r.status === 'pending').length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <TrendingUp className="w-8 h-8 text-slate-300 opacity-60 flex-shrink-0" />
                      <span>কোন বকেয়া প্লেয়ার ডিপোজিট অনুরোধ নেই।</span>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[250px]">টপ-রাইট বাটন চেপে সরাসরি ডেমো খেলোয়াড় অনুরোধ যোগ করতে পারবেন।</p>
                    </div>
                  ) : (
                    playerRequests.filter(r => r.type === 'deposit' && r.status === 'pending').map((req) => (
                      <div
                        key={req.id}
                        onClick={() => { setErrorMsg(''); setSelectedPlayerReq(req); }}
                        className="p-3 bg-white border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition duration-150 shadow-3xs cursor-pointer hover:scale-[1.01]"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-[12.5px] font-mono">{req.playerId}</span>
                            <span className="text-[9px] uppercase font-bold text-blue-800 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded-sm">{req.siteName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans">পেমেন্টঃ <strong className="text-slate-600 uppercase font-bold">{req.paymentMethod}</strong> • {req.senderNumber}</span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-blue-700">৳{req.amount.toLocaleString('bn-BD')}</span>
                          <span className="text-[9.5px] font-bold text-slate-400 hover:text-blue-700 transition">বিবরণ দেখুন →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </ModalContainer>
      )}

      {/* 2. WITHDRAW MODAL */}
      {type === 'withdraw' && (
        <ModalContainer title="খেলোয়াড় উইথড্রাল নোটিফিকেশন পুল" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-4">
            
            {/* 2.1 PAYMENT RECEIPT DISPLAY */}
            {resolvedReceipt && resolvedReceipt.req.type === 'withdraw' ? (
              <div className="flex flex-col gap-3 font-sans">
                <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl text-center flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                  <h4 className="text-sm font-bold text-emerald-800">উইথড্রয়াল প্রসেসিং সফল!</h4>
                  <p className="text-[10px] text-emerald-600 font-medium">রসিদ সেশনের জন্য সংরক্ষণ করা হল</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-[11px] font-mono leading-relaxed space-y-1">
                  <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">== AGENT PAY RECEIPT ==</div>
                  <div>অনুরোধ আইডি: {resolvedReceipt.req.id}</div>
                  <div>তারিখ ও সময়: {new Date(resolvedReceipt.timestamp).toLocaleString('bn-BD')}</div>
                  <div>প্লেয়ার আইডি: {resolvedReceipt.req.playerId}</div>
                  <div>বেটিং সাইট: {resolvedReceipt.req.siteName}</div>
                  <div>পরিমাণ: ৳{resolvedReceipt.req.amount.toLocaleString('bn-BD')} টাকা</div>
                  <div>পেমেন্ট মেথড: {resolvedReceipt.req.paymentMethod}</div>
                  <div>গ্রাহক নম্বর: {resolvedReceipt.req.senderNumber}</div>
                  <div className="pt-2 border-t border-dashed border-slate-300">কমিশন (২.০%): BDT {(resolvedReceipt.req.amount * 0.02).toLocaleString('bn-BD')} টাকা</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => downloadReceiptTxt(resolvedReceipt.req, resolvedReceipt.status)}
                    className="py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    রসিদ ডাউনলোড করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResolvedReceipt(null); setSelectedPlayerReq(null); }}
                    className="py-2 rounded-xl border border-slate-250 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    নতুন অনুরোধ দেখুন
                  </button>
                </div>
              </div>
            ) : selectedPlayerReq && selectedPlayerReq.type === 'withdraw' ? (
              
              /* 2.2 VIEW SINGLE WITHDRAW REQUEST DETAILS & QUOTA LIMITS */
              <div className="flex flex-col gap-4 font-sans text-xs">
                {(() => {
                  const isQuotaInsufficient = selectedPlayerReq.amount > remainingWithdrawLimit;

                  return (
                    <>
                      <div className="flex items-center justify-between border-b pb-2 border-slate-150">
                        <button
                           type="button"
                           onClick={() => { setErrorMsg(''); setSelectedPlayerReq(null); }}
                           className="text-rose-700 hover:text-rose-800 font-bold"
                        >
                           ← ফিরে যান
                        </button>
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">{selectedPlayerReq.id}</span>
                      </div>
 
                      {/* Quota limit diagnostics screen */}
                      <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col gap-1 text-[11px]">
                        <span className="font-bold text-amber-900">🔔 ডিপোজিট-ভিত্তিক উইথড্র সীমা পর্যবেক্ষণঃ</span>
                        <div className="flex justify-between mt-1 text-slate-600">
                          <span>মোট এডমিন ডিপোজিট (জমা):</span>
                          <span className="font-bold">৳{totalAgentDeposit.toLocaleString('bn-BD')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>এপর্যন্ত সফল উইথড্র এপ্রুভালঃ</span>
                          <span className="font-bold text-rose-600">৳{totalApprovedPlayerWithdraws.toLocaleString('bn-BD')}</span>
                        </div>
                        <div className="flex justify-between border-t border-amber-200/50 pt-1 font-semibold text-slate-800">
                          <span>অবশিষ্ট উইথড্র এপ্রুভাল সীমাঃ</span>
                          <span className={`${remainingWithdrawLimit > 0 ? 'text-emerald-700' : 'text-slate-500'} font-bold`}>৳{remainingWithdrawLimit.toLocaleString('bn-BD')} টাকা</span>
                        </div>
                      </div>

                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-sm font-bold border-b pb-2 border-slate-100">
                          <span className="text-slate-500">বেটিং ওয়েবসাইট</span>
                          <span className="text-rose-700 font-extrabold uppercase">{selectedPlayerReq.siteName}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">প্লেয়ার আইডি/Username</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">{selectedPlayerReq.playerId}</span>
                        </div>

                        <div className="flex justify-between items-center text-base font-extrabold">
                          <span className="text-slate-500 text-xs">উইথড্রয়াল পরিমাণ</span>
                          <span className="text-slate-900">৳{selectedPlayerReq.amount.toLocaleString('bn-BD')} টাকা</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">পেমেন্ট গেটওয়ে</span>
                          <span className="font-bold text-slate-700 uppercase bg-slate-200 px-2 py-0.5 rounded-sm">{selectedPlayerReq.paymentMethod}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">গ্রাহকের রিসিভিং নম্বর</span>
                          <span className="font-mono font-semibold text-slate-800">{selectedPlayerReq.senderNumber}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-150/60 text-[10px]">
                          <span className="text-slate-400">উপার্জিত কমিশন (২.০%):</span>
                          <span className="font-bold text-emerald-600">+ ৳{(selectedPlayerReq.amount * 0.02).toLocaleString('bn-BD')} টাকা</span>
                        </div>
                      </div>

                      {isQuotaInsufficient && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl leading-relaxed font-medium">
                          ⚠️ <strong>অনুমোদন ব্লক করা হয়েছে:</strong> আপনার অবশিষ্ট উইথড্রাল অনুমোদন সীমা অপর্যাপ্ত। অতিরিক্ত উইথড্র সীমা বাড়ানোর জন্য দয়া করে অ্যাডমিন ড্যাশবোর্ডে নতুন রিচার্জ (জমা) অনুরোধ পাঠিয়ে এপ্রুভ করিয়ে নিন।
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onResolvePlayerRequest(selectedPlayerReq.id, 'rejected');
                            setResolvedReceipt({ req: selectedPlayerReq, status: 'rejected', timestamp: Date.now() });
                          }}
                          className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold cursor-pointer"
                        >
                          বাতিল করুন
                        </button>
                        <button
                          type="button"
                          disabled={isQuotaInsufficient}
                          onClick={() => {
                            onResolvePlayerRequest(selectedPlayerReq.id, 'approved');
                            setResolvedReceipt({ req: selectedPlayerReq, status: 'approved', timestamp: Date.now() });
                          }}
                          className={`py-2.5 rounded-xl text-white font-bold shadow-xs transition leading-normal ${
                            isQuotaInsufficient 
                              ? 'bg-slate-350 cursor-not-allowed opacity-50' 
                              : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                          }`}
                        >
                          উইথড্র এপ্রুভ করুন
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              
              /* 2.3 SHOW LIST OF ALL PENDING WITHDRAWALS */
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-150 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-rose-900 text-xs">উইথড্র রিফ্রেশ ক্যু</h5>
                    <span className="text-[10px] text-rose-700">পরবর্তী স্বয়ংক্রিয় অনুরোধঃ <strong className="font-mono text-xs">{timeLeft}</strong> সেকেন্ড</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerPlayerRequest('withdraw')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10.5px] font-bold transition shadow-2xs cursor-pointer active:scale-97"
                  >
                    ⚡ অনুরোধ আনুন
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto no-scrollbar font-sans pr-0.5">
                  {playerRequests.filter(r => r.type === 'withdraw' && r.status === 'pending').length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <TrendingDown className="w-8 h-8 text-slate-300 opacity-60 flex-shrink-0" />
                      <span>কোন বকেয়া প্লেয়ার উইথড্রয়াল অনুরোধ নেই।</span>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[250px]">টপ-রাইট বাটন চেপে সরাসরি ডেমো খেলোয়াড় অনুরোধ যোগ করতে পারবেন।</p>
                    </div>
                  ) : (
                    playerRequests.filter(r => r.type === 'withdraw' && r.status === 'pending').map((req) => (
                      <div
                        key={req.id}
                        onClick={() => { setErrorMsg(''); setSelectedPlayerReq(req); }}
                        className="p-3 bg-white border border-slate-200 hover:border-rose-300 rounded-xl flex items-center justify-between transition duration-150 shadow-3xs cursor-pointer hover:scale-[1.01]"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-[12.5px] font-mono">{req.playerId}</span>
                            <span className="text-[9px] uppercase font-bold text-rose-850 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-sm">{req.siteName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans">পেমেন্টঃ <strong className="text-slate-600 uppercase font-bold">{req.paymentMethod}</strong> • {req.senderNumber}</span>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-rose-700">৳{req.amount.toLocaleString('bn-BD')}</span>
                          <span className="text-[9.5px] font-bold text-slate-400 hover:text-rose-700 transition">অনুমোদন বিবরণ →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </ModalContainer>
      )}

      {/* 3. ADD BALANCE MODAL */}
      {type === 'add_balance' && (
        <ModalContainer title="মূল এজেন্ট ব্যালেন্স রিচার্জ পোর্টাল" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          {balanceStep === 1 && (
            <form onSubmit={handleBalanceStep1Submit} className="flex flex-col gap-4 font-sans">
              <div className="p-3 bg-blue-50 border border-blue-105 rounded-xl text-xs text-blue-700 leading-relaxed font-sans">
                💡 <strong>ধাপ ১ (তথ্য সংগ্রহ):</strong> ব্যালেন্স যুক্ত করতে অনুগ্রহ করে আপনার বিবরণ এবং রিচার্জের কাঙ্ক্ষিত মাধ্যম ও টাকার পরিমাণ প্রদান করুন।
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">এজেন্ট আইডি (Agent ID)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">👤</span>
                  <input
                    type="text"
                    placeholder="যেমনঃ AG-49102"
                    value={customAgentId}
                    onChange={(e) => { setErrorMsg(''); setCustomAgentId(e.target.value); }}
                    className="w-full pl-8 pr-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-800 outline-none transition font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">পেমেন্ট মেথড (Payment Method)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Bank', 'bKash', 'Nagad', 'Rocket'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setReqMethod(m)}
                      className={`py-2 text-[11px] font-bold rounded-lg border text-center transition cursor-pointer ${
                        reqMethod === m 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'Bank' ? 'City Bank' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">টাকার পরিমাণ (Amount)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    placeholder="যেমনঃ ৫০,০০০"
                    value={amountInput}
                    onChange={(e) => { setErrorMsg(''); setAmountInput(e.target.value); }}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-850 outline-none transition font-bold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition mt-2 cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
              >
                পরবর্তী ধাপে যান <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {balanceStep === 2 && (
            <form onSubmit={handleBalanceStep2Submit} className="flex flex-col gap-3.5 font-sans">
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col gap-2.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">টাকা পাঠানোর আমাদের পেমেন্ট নাম্বারসমূহঃ</span>
                
                <div className="flex flex-col gap-2">
                  {(reqMethod === 'bKash'
                    ? [{ label: 'বিকাশ পার্সোনাল', num: '01701-976286' }]
                    : reqMethod === 'Nagad'
                    ? [{ label: 'নগদ পার্সোনাল', num: '01701-976286' }]
                    : reqMethod === 'Rocket'
                    ? [{ label: 'রকেট পার্সোনাল', num: '01701-976286' }]
                    : [{ label: 'বিকাশ/নগদ পেমেন্ট গেটওয়ে', num: '01701-976286' }]
                  ).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-[9.5px] font-bold text-rose-500 uppercase">{p.label}</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{p.num}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanedNum = p.num.replace(/[^0-9]/g, '');
                          navigator.clipboard.writeText(cleanedNum);
                          setSuccessMsg('নাম্বারটি ক্লিপবোর্ডে কপি হয়েছে!');
                          setTimeout(() => setSuccessMsg(''), 1500);
                        }}
                        className="p-1 px-2 rounded-md hover:bg-rose-50 font-sans text-[10px] font-bold text-rose-600 border border-rose-100 flex items-center gap-1 transition"
                      >
                        <Copy className="w-3 h-3" /> কপি করুন
                      </button>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] text-rose-600/80 font-medium leading-relaxed">
                  ⚠️ <strong>সতর্কতা:</strong> উপরের নাম্বারে সেন্ড মানি/ক্যাশইন সফলভাবে সম্পন্ন করার পর নিচের ফর্মটি পূরণ করে অনুরোধ সাবমিট করুন।
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">আপনার প্রেরক নাম্বার</label>
                  <input
                    type="text"
                    placeholder="যেমনঃ 01812XXXXXX"
                    value={senderNumber}
                    onChange={(e) => { setErrorMsg(''); setSenderNumber(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-800 outline-none transition font-semibold"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">ট্রানজেকশন আইডি (TxID)</label>
                  <input
                    type="text"
                    placeholder="যেমনঃ BK9851025B"
                    value={txid}
                    onChange={(e) => { setErrorMsg(''); setTxid(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-800 uppercase outline-none transition font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Screenshot Upload Support */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">পেমেন্ট স্ক্রিনশট আপলোড (ঐচ্ছিক)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 bg-slate-50/50 hover:bg-blue-50/10 transition flex flex-col items-center justify-center gap-2 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    id="screenshot-file-input"
                  />
                  {screenshotUploading ? (
                    <span className="text-[11px] font-bold text-slate-500 animate-pulse">প্রসেসিং হচ্ছে...</span>
                  ) : screenshotUrl ? (
                    <div className="flex flex-col items-center gap-1.5 relative z-20">
                      <img src={screenshotUrl} alt="Screenshot" className="h-14 w-auto rounded-md border border-slate-200 shadow-sm object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotUrl('');
                        }}
                        className="text-[9.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 hover:bg-rose-100"
                      >
                        রিমুভ করুন
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-1">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-[10.5px] text-slate-500 font-semibold">ক্লিক করে স্ক্রিনশট সিলেক্ট করুন</span>
                      <span className="text-[9px] text-slate-400">JPG বা PNG ফরম্যাট</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBalanceStep(1)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-205 text-xs text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  পিছনে যান
                </button>
                <button
                  type="submit"
                  id="submit_add_balance_btn"
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
                >
                  অনুরোধ সাবমিট করুন
                </button>
              </div>
            </form>
          )}

          {balanceStep === 3 && (
            <div className="flex flex-col items-center text-center py-4 font-sans">
              <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-sm font-bold text-slate-850">ব্যালেন্স রিচার্জ অনুরোধ সাবমিট হয়েছে!</h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                আপনার অনুরোধটি এডমিন ডাটাবেসে নিবন্ধিত হয়েছে। এখন নিচে দেওয়া পেমেন্ট ডিরেক্ট লিংকটি কপি করুন অথবা সরাসরি টেলিগ্রামে এডমিনের কাছে পাঠিয়ে দিন।
              </p>

              {/* Unique Generation Link */}
              <div className="w-full mt-4 bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col gap-1.5 text-left text-xs">
                <span className="text-[9.5px] font-bold text-slate-450 uppercase block tracking-wider">ডিপোজিট বিবরণ যাচাইকরণ লিংক:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?request_id=${generatedReqId}`}
                    className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono text-slate-705 outline-none font-medium select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?request_id=${generatedReqId}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer ${
                      linkCopied 
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {linkCopied ? 'কপিড!' : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Telegram admin connector */}
              <a
                href={`https://t.me/bdwalletagent?text=${encodeURIComponent(
                  `আসসালামু আলাইকুম এডমিন, আমি ব্যালেন্স রিচার্জের একটি অনুরোধ পাঠিয়েছি। অনুগ্রহ করে যাচাই করুন:\n\n🔗 অনুরোধের লিংক: ${window.location.origin}/?request_id=${generatedReqId}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full mt-4.5 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1a85b9] text-xs font-extrabold text-white flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer group animate-pulse hover:animate-none"
              >
                <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> 
                টেলিগ্রামে এডমিনকে লিংক পাঠান
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs text-slate-650 font-bold transition cursor-pointer"
              >
                ওয়ালেট প্যানেলে ফিরে যান
              </button>
            </div>
          )}
        </ModalContainer>
      )}

      {/* 4. WITHDRAW COMMISSION MODAL */}
      {type === 'withdraw_commission' && (
        <ModalContainer title="উপার্জিত কমিশন ব্যালেন্স উত্তোলন" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          {commissionStep === 1 ? (
            <form onSubmit={handleCommissionWithdrawal} className="flex flex-col gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">অবশিষ্ট কমিশন ফান্ড</span>
                  <span className="text-sm font-bold text-amber-600">৳ {formatCurrency(agent.commissionBalance)} টাকা</span>
                </div>
                <BadgePercent className="w-8 h-8 text-amber-600 bg-amber-50 p-1.5 rounded-xl border border-amber-200 animate-pulse" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">উত্তোলন গেটওয়ে</label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setCommMethod('main_balance')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      commMethod === 'main_balance' 
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55'
                    }`}
                  >
                    <span className="text-xs font-bold">মেইন ওয়ালেট</span>
                    <span className="text-[9px] mt-0.5 leading-tight text-slate-500">instant-ফ্রি ব্যালেন্স কনভার্ট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommMethod('mobile_banking')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      commMethod === 'mobile_banking' 
                        ? 'bg-blue-50 border-blue-400 text-blue-800' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55'
                    }`}
                  >
                    <span className="text-xs font-bold">মোবাইল ব্যাংকিং</span>
                    <span className="text-[9px] mt-0.5 leading-tight text-slate-505">bKash/Nagad ওয়ালেটে ক্যাশআউট</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">উত্তোলন টাকার পরিমাণ</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">৳</span>
                  <input
                    type="number"
                    placeholder="যেমনঃ ১,৫০০"
                    value={amountInput}
                    onChange={(e) => { setErrorMsg(''); setAmountInput(e.target.value); }}
                    className="w-full pl-8 pr-4 py-2 text-sm rounded-lg bg-slate-55 border border-slate-200 focus:border-blue-500 text-slate-850 outline-none transition font-semibold"
                    max={agent.commissionBalance}
                    required
                  />
                </div>
              </div>

              {commMethod === 'mobile_banking' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3.5 border-t border-slate-150 pt-3"
                >
                  {/* Telegram Contact Notification Box */}
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between gap-3 text-sky-850 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 flex-shrink-0">
                        <Send className="w-4 h-4 ml-0.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-bold text-sky-800">কমিশন ক্যাশআউট সাপোর্ট</span>
                        <span className="text-[9.5px] text-slate-505 leading-normal mt-0.5">কমিশন রিকোয়েস্ট তৈরি করে পেমেন্ট পেতে সরাসরি আমাদের অফিশিয়াল টেলিগ্রামে মেসেজ দিন।</span>
                      </div>
                    </div>
                    <a
                      href="https://t.me/bdwalletagent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition hover:scale-105 flex items-center justify-center gap-1 cursor-pointer"
                      title="টেলিগ্রামে মেসেজ দিন"
                    >
                      <Send className="w-3.5 h-3.5 ml-0.5 text-white" />
                    </a>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">মোবাইল ব্যাংকিং অপারেটর</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['bKash', 'Nagad', 'Rocket', 'Upay'] as const).map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setCommMobileMethod(opt)}
                          className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                            commMobileMethod === opt 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">রিসিভার পারসোনাল মোবাইল অ্যাকাউন্ট নম্বর</label>
                    <input
                      type="text"
                      placeholder="যেমনঃ 017XXXXXXXX"
                      value={receiverNumber}
                      onChange={(e) => { setErrorMsg(''); setReceiverNumber(e.target.value); }}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-55 border border-slate-200 focus:border-blue-500 text-slate-800 outline-none transition font-semibold"
                      required
                    />
                  </div>
                </motion.div>
              )}

              <button
                type="submit"
                id="confirm_commission_withdrawal"
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-sm font-bold text-white transition mt-2 shadow-xs cursor-pointer"
              >
                কমিশন উত্তোলন রিকোয়েস্ট নিশ্চিত করুন
              </button>

              {/* General bottom Telegram quick links */}
              <div className="flex justify-center items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-sans">
                <span>যেকোনো প্রয়োজনে সরাসরিঃ</span>
                <a
                  href="https://t.me/bdwalletagent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5 text-sky-600" /> টেলিগ্রামে মেসেজ দিন
                </a>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center py-1">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-500/20">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <h4 className="text-sm font-bold text-slate-800 mb-1">কমিশন উত্তোলন রিকোয়েস্ট রসিদ</h4>
              <p className="text-[10px] text-slate-500 text-center max-w-sm leading-relaxed mb-4">
                {commMethod === 'mobile_banking' 
                  ? 'আপনার কমিশন ক্যাশআউট রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে। দ্রুত সাপোর্ট পেতে আবেদনটি টেলিগ্রামে শেয়ার করুন।' 
                  : 'আপনার উপার্জিত কমিশন ব্যালেন্স তাৎক্ষণিকভাবে মেইন ওয়ালেট ব্যালেন্সে রূপান্তর করা হয়েছে।'}
              </p>

              {/* Receipt Area */}
              <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden font-sans text-left text-xs text-slate-755 leading-relaxed flex flex-col gap-2.5 shadow-3xs mb-4">
                {/* Decorative cutouts at the side bottom */}
                <div className="absolute left-0 bottom-0 top-0 w-1 flex flex-col justify-between items-center py-2 gap-1.5 pointer-events-none">
                  {[...Array(8)].map((_, i) => <span key={i} className="w-1.5 h-1.5 bg-white rounded-full -ml-1 border border-slate-150"></span>)}
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1 flex flex-col justify-between items-center py-2 gap-1.5 pointer-events-none">
                  {[...Array(8)].map((_, i) => <span key={i} className="w-1.5 h-1.5 bg-white rounded-full -mr-1 border border-slate-150"></span>)}
                </div>

                <div className="border-b border-dashed border-slate-250 pb-2.5 flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">অন-লাইন রসিদ আইডি</span>
                    <span className="text-[11px] font-mono font-bold text-slate-700">COM-WD-{toBanglaNum(Date.now().toString().slice(-6))}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">তারিখ ও সময়</span>
                    <span className="text-[10.5px] text-slate-600 font-semibold">{toBanglaNum(new Date().toLocaleDateString('bn-BD'))} | {toBanglaNum(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }))}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-2 border-b border-dashed border-slate-250 pb-2.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">এজেন্ট আইডি:</span>
                    <code className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{agent.id}</code>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">উত্তোলন গেটওয়ে (Method):</span>
                    <span className="font-bold text-slate-800">
                      {commMethod === 'mobile_banking' 
                        ? `${commMobileMethod === 'bKash' ? 'বিকাশ (bKash)' : commMobileMethod === 'Nagad' ? 'নগদ (Nagad)' : commMobileMethod === 'Rocket' ? 'রকেট (Rocket)' : 'উপায় (Upay)'}` 
                        : 'মেইন ওয়ালেট কনভার্ট'}
                    </span>
                  </div>
                  {commMethod === 'mobile_banking' && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">রিসিভার নম্বর (Account):</span>
                      <span className="font-mono font-bold text-slate-800">{toBanglaNum(receiverNumber)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">রিকোয়েস্ট স্ট্যাটাস:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      commMethod === 'mobile_banking' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {commMethod === 'mobile_banking' ? 'পেন্ডিং / পেমেন্ট অপেক্ষায়' : 'সফল / ওয়ালেটে যোগকৃত'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 px-2">
                  <span className="text-slate-500 font-bold">মোট উত্তোলিত টাকা:</span>
                  <span className="text-sm font-black text-blue-700">৳ {formatCurrency(commAmountValue)} টাকা</span>
                </div>
              </div>

              {commMethod === 'mobile_banking' ? (
                <>
                  <div className="bg-sky-50 border border-sky-150 p-3 rounded-xl text-[11px] text-sky-850 mb-4 flex flex-col gap-1.5 text-center leading-normal">
                    <span className="font-bold text-sky-900 flex items-center gap-1 justify-center">
                      <Send className="w-3.5 h-3.5 text-sky-600 ml-0.5" /> টেলিগ্রামে মেসেজ দিয়ে পেমেন্ট নিন!
                    </span>
                    <span>তাত্ক্ষণিক পেমেন্ট রিলিজ করতে নিচের বাটনে চাপুন। মেসেজে আপনার রসিদের বিস্তারিত তথ্য স্বয়ংক্রিয়ভাবে ইনপুট করা থাকবে।</span>
                  </div>

                  <a
                    href={`https://t.me/bdwalletagent?text=${encodeURIComponent(
                      `আসসালামু আলাইকুম এডমিন, আমি উপার্জিত কমিশন উত্তোলনের অন-লাইন রিকোয়েস্ট সাবমিট করেছি। অনুগ্রহ করে চেক করে পেমেন্ট সম্পূর্ণ করুন:\n\n👤 এজেন্ট আইডি: ${agent.id}\n👤 এজেন্টের নাম: ${agent.name}\n💰 উত্তোলনের পরিমাণ: ৳ ${commAmountValue.toLocaleString('en-US')} টাকা\n💳 গেটওয়ে: ${commMobileMethod} (${receiverNumber})\n🆔 রসিদ আইডি: COM-WD-${Date.now().toString().slice(-6)}\n\nধন্যবাদ!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-[#229ED9] hover:bg-[#1a85b9] text-xs font-extrabold text-white flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer group animate-pulse hover:animate-none"
                  >
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> 
                    টেলিগ্রামে অটোমেটিক মেসেজ পাঠান
                  </a>
                </>
              ) : (
                <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl text-[11px] text-emerald-850 mb-4 text-center leading-normal w-full">
                  <span className="font-bold text-emerald-900 block mb-0.5">মেইন ওয়ালেট সফলভাবে রিচার্জ হয়েছে!</span>
                  <span>৳ {formatCurrency(commAmountValue)} টাকা আপনার মেইন ব্যালেন্সে যুক্ত হয়েছে। কোনো প্রকার চার্জ ছাড়াই তাৎক্ষণিক লেনদেন সুবিধা পাবেন।</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setCommissionStep(1);
                  onClose();
                }}
                className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs text-slate-650 font-bold transition cursor-pointer"
              >
                ওয়ালেট প্যানেলে ফিরে যান
              </button>
            </div>
          )}
        </ModalContainer>
      )}

      {/* 5. TRANSACTION HISTORY MODAL */}
      {type === 'history' && (
        <ModalContainer title="এজেন্ট লেজার ট্রানজেকশন হিস্ট্রি" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-3.5 max-h-[72vh] overflow-hidden">
            {/* Filter Section */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="খেলোয়াড় আইডি, মেথড বা লেনদেন আইডি দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-700 outline-none transition"
              />

              <div className="flex flex-wrap gap-1 text-[11px] max-h-24 overflow-y-auto no-scrollbar">
                {(['all', 'deposit', 'withdraw', 'balance_add', 'commission_withdraw'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setHistoryType(t)}
                    className={`px-2.5 py-1.5 font-bold rounded-lg border text-center transition cursor-pointer text-[10px] sm:text-[10.5px] ${
                      historyType === t
                        ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'all' && 'সব লেনদেন'}
                    {t === 'deposit' && 'চলতি ডিপোজিট'}
                    {t === 'withdraw' && 'চলতি উইথড্রয়াল'}
                    {t === 'balance_add' && 'ব্যালেন্স রিচার্জ'}
                    {t === 'commission_withdraw' && 'কমিশন উত্তোলন'}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2.5 max-h-[340px] pr-0.5">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center gap-1.5">
                  <History className="w-8 h-8 text-slate-400 opacity-60" />
                  <span>কোন লেনদেন তথ্য পাওয়া যায়নি।</span>
                </div>
              ) : (
                filteredHistory.map((t) => {
                  const tType = t.type as string;
                  const isDeposit = tType === 'deposit';
                  const isDepositRej = tType === 'deposit_rejected' || tType === 'deposit_cancelled';
                  const isWithdraw = tType === 'withdraw';
                  const isWithdrawRej = tType === 'withdraw_rejected' || tType === 'withdraw_cancelled';
                  const isBalanceAdd = tType === 'balance_add';
                  const isBalanceRej = tType === 'balance_rejected';
                  const isComWithdraw = tType === 'commission_withdraw';

                  let iconColor = "bg-slate-50 border-slate-100 text-slate-700";
                  let itemIcon = <ArrowDownLeft className="w-4 h-4" />;
                  let displayTypeStr = "লেনদেন";
                  let amountPrefix = "";
                  let amountColor = "text-slate-800";
                  let commissionText = "";
                  let isAmountStriked = false;

                  if (isDeposit) {
                    iconColor = "bg-amber-50 border-amber-100 text-amber-700";
                    itemIcon = <ArrowUpRight className="w-4 h-4" />;
                    displayTypeStr = "ডিপোজিট";
                    amountPrefix = "-";
                    amountColor = "text-rose-600 font-semibold";
                    commissionText = `+ ৳ ${toBanglaNum(t.comAmount || 0)} (কমিশন BDT)`;
                  } else if (isDepositRej) {
                    iconColor = "bg-rose-50 border-rose-100 text-rose-600";
                    itemIcon = <ArrowUpRight className="w-4 h-4 text-rose-500" />;
                    displayTypeStr = "ডিপোজিট বাতিল";
                    amountPrefix = "✖";
                    amountColor = "text-slate-400 line-through";
                    isAmountStriked = true;
                    commissionText = "ব্যর্থ লেনদেন";
                  } else if (isWithdraw) {
                    iconColor = "bg-emerald-50 border-emerald-100 text-emerald-700";
                    itemIcon = <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
                    displayTypeStr = "উইথড্রয়াল";
                    amountPrefix = "+";
                    amountColor = "text-emerald-700";
                    commissionText = `+ ৳ ${toBanglaNum(t.comAmount || 0)} (কমিশন BDT)`;
                  } else if (isWithdrawRej) {
                    iconColor = "bg-rose-50 border-rose-100 text-rose-600";
                    itemIcon = <ArrowDownLeft className="w-4 h-4 text-rose-500" />;
                    displayTypeStr = "উইথড্রয়াল বাতিল";
                    amountPrefix = "✖";
                    amountColor = "text-slate-400 line-through";
                    isAmountStriked = true;
                    commissionText = "ব্যর্থ লেনদেন";
                  } else if (isBalanceAdd) {
                    iconColor = "bg-blue-50 border-blue-100 text-blue-700";
                    itemIcon = <Coins className="w-4 h-4 text-blue-600" />;
                    displayTypeStr = "ব্যালেন্স রিচার্জ";
                    amountPrefix = "+";
                    amountColor = "text-blue-700 font-bold";
                    commissionText = "ওয়ালেটে যোগ হয়েছে";
                  } else if (isBalanceRej) {
                    iconColor = "bg-slate-100 border-slate-200 text-slate-500";
                    itemIcon = <X className="w-4 h-4 text-slate-400" />;
                    displayTypeStr = "রিচার্জ বাতিল";
                    amountPrefix = "✖";
                    amountColor = "text-slate-400 line-through";
                    isAmountStriked = true;
                    commissionText = "অ্যাডমিন রিজেক্টেড";
                  } else if (isComWithdraw) {
                    iconColor = "bg-purple-50 border-purple-100 text-purple-700";
                    itemIcon = <BadgePercent className="w-4 h-4 text-purple-600" />;
                    displayTypeStr = "কমিশন উত্তোলন";
                    amountPrefix = "-";
                    amountColor = "text-purple-700 font-bold";
                    commissionText = "ওয়ালেটে ট্রান্সফার";
                  }

                  return (
                    <div
                      key={t.id}
                      className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between transition-colors duration-200 shadow-3xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg border flex-shrink-0 ${iconColor}`}>
                          {itemIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{t.playerName || 'এজেন্ট'}</span>
                            <span className="text-[8.5px] font-sans font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded uppercase">
                              {t.method || 'ওয়ালেট'}
                            </span>
                            <span className={`text-[8.5px] font-sans font-bold px-1 py-0.2 rounded uppercase ${
                              isDeposit || isWithdraw || isBalanceAdd ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                              isComWithdraw ? 'bg-purple-50 text-purple-700 border border-purple-150' : 'bg-rose-50 text-rose-700 border border-rose-150'
                            }`}>
                              {displayTypeStr}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5 min-w-0">
                            {t.playerId && t.playerId !== 'ADMIN_GATEWAY' && t.playerId !== 'COMMISSION_FUND' && (
                              <code className="text-blue-600 font-mono font-semibold truncate max-w-[80px]">{t.playerId}</code>
                            )}
                            {t.playerId && t.playerId !== 'ADMIN_GATEWAY' && t.playerId !== 'COMMISSION_FUND' && <span>•</span>}
                            <span className="text-[9px] text-slate-400 truncate max-w-[100px]" title={t.id}>{t.id}</span>
                            <span>•</span>
                            <span>{toBanglaNum(new Date(t.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }))}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-bold font-sans ${amountColor}`}>
                            {amountPrefix} ৳ {formatCurrency(t.amount)}
                          </span>
                          <span className={`text-[8.5px] block font-bold leading-3 mt-0.5 ${
                            isDeposit || isWithdraw ? 'text-emerald-750' : 'text-slate-400'
                          }`}>
                            {commissionText}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('আপনি কি এই লেনদেন রেকর্ডটি সম্পূর্ণভাবে ডিলিট করতে চান?')) {
                              onDeleteTransaction(t.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-transform hover:scale-105 cursor-pointer flex items-center justify-center border border-red-100"
                          title="লেনদেন হিস্ট্রি ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-650" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </ModalContainer>
      )}

      {/* 6. REFERRAL MODAL */}
      {type === 'referral' && (
        <ModalContainer title="রেফারেল নেটওয়ার্ক ও বোনাস" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 block mb-1">আপনার ইউনিক রেফারেল কোড</span>
              <div className="flex items-center justify-center gap-2 bg-white p-2.5 rounded-lg border border-purple-200 w-fit mx-auto shadow-3xs mt-1.5 font-sans">
                <span className="text-base font-black text-purple-900 tracking-widest font-mono select-all">
                  {agent.referralCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(agent.referralCode);
                    setErrorMsg('রেফার কোড কপি হয়েছে!');
                    setTimeout(() => setErrorMsg(''), 1500);
                  }}
                  className="p-1.5 rounded hover:bg-slate-100 text-purple-700 hover:text-purple-900 transition cursor-pointer"
                  title="কপি করুন"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col gap-0.5 shadow-3xs">
                <span className="text-[9.5px] font-bold text-slate-500 block uppercase">মোট রেফার লিংক</span>
                <span className="text-base font-black text-purple-700">{formatCurrency(agent.referralsCount)} জন এজেন্ট</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col gap-0.5 shadow-3xs">
                <span className="text-[9.5px] font-bold text-slate-500 block uppercase">অর্জিত রেফারেল বোনাস</span>
                <span className="text-base font-black text-emerald-700 font-bold">৳ {formatCurrency(agent.referralEarnings)} টাকা</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 font-sans overflow-hidden">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-150 pb-1 font-sans">আমন্ত্রিত সাব-এজেন্ট সমূহ</h5>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto no-scrollbar">
                {[
                  { id: "AG204", date: "১৫ জুন ২০২৬", earned: 650 },
                  { id: "AG401", date: "১০ জুন ২০২৬", earned: 1200 },
                  { id: "AG582", date: "০২ জুন ২০২৬", earned: 950 },
                ].map((ref, idx) => (
                  <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-3xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-800">এজেন্ট {ref.id}</span>
                      <span className="text-[9px] text-slate-400 font-mono">নিবন্ধনঃ {ref.date}</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">+ ৳ {formatCurrency(ref.earned)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* 7. GUIDE MODAL */}
      {type === 'guide' && (
        <ModalContainer title="নির্দেশিকা ও চার্জিং কমিশন পলিসি" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="p-4 bg-blue-50/60 border border-blue-150 rounded-xl flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-blue-600 animate-bounce flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-slate-800">ইনস্ট্যান্ট কমিশন এবং ব্যালেন্স সিস্টেম</h5>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-sans">এজেন্ট পে ড্যাশবোর্ডে ডিপোজিট ও উইথড্রয়ের জন্য রিয়েল-টাইম হিসাবের সঠিক তথ্যাবলী নিচে দেওয়া হল।</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  ডিপোজিট কমিশন: ৩.০% (3.0%)
                </span>
                <p className="text-[10.5px] text-slate-600 leading-relaxed mt-1.5 font-sans">
                  যখন কোন খেলোয়াড় আপনার ড্যাশবোর্ডের মাধ্যমে ডিপোজিট করতে বলবে, তার অ্যাকাউন্ট আইডি যাচাই করে নির্দিষ্ট পরিমাণ টাকা ডিপোজিট করুন। আপনার মূল এজেন্ট ব্যালেন্স থেকে উক্ত টাকা কর্তন করে নেয়া হবে এবং অবিলম্বে তার বিপরীতে <span className="font-bold text-slate-800">৩.০ শতাংশ কমিশন</span> আপনার কমিশন ওয়ালেটে ক্রেডিট করা হবে।
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                  <ArrowDownLeft className="w-4 h-4" />
                  উইথড্র কমিশন: ২.০% (2.0%)
                </span>
                <p className="text-[10.5px] text-slate-600 leading-relaxed mt-1.5 font-sans">
                  উইথড্রয়ের ক্ষেত্রে প্লেয়ার থেকে টাকা ক্যাশআউট গ্রহণ করার সাথে সাথেই আপনার মূল ব্যালেন্স বৃদ্ধিপাবে কারণ আপনি প্লেয়ারকে নগদ টাকা বুঝিয়ে দিচ্ছেন। এই সার্ভিসটির জন্য অতিরিক্ত <span className="font-bold text-slate-800">২.০ শতাংশ প্রসেসিং কমিশন</span> যোগ হবে।
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                  <PlusCircle className="w-4 h-4" />
                  ব্যালেন্স যুক্ত করার নিয়ম
                </span>
                <p className="text-[10.5px] text-slate-600 leading-relaxed mt-1.5 font-sans">
                  এজেন্ট পে ওয়ালেটে ২৪ ঘণ্টা ব্যালেন্স রিচার্জ রিকোয়েস্ট করতে পারেন। সিটি ব্যাংক ব্যাংক বা মোবাইল ব্যাংকিং নম্বরে টাকা পাঠিয়ে ও সঠিক TxID ব্যবহার করে সাবমিট করুন। অ্যাডমিন অবিলম্বে ভেরিফাই করে অ্যাপ্রুভ করবেন।
                </p>
              </div>
            </div>
          </div>
        </ModalContainer>
      )}

      {/* 8. TELEGRAM SUPPORT MODAL */}
      {type === 'support' && (
        <ModalContainer title="লাইভ সাপোর্ট গেটওয়ে" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <div className="flex flex-col gap-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-sky-50 border-2 border-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-2 animate-bounce shadow-3xs">
              <Send className="w-8 h-8 ml-0.5 text-sky-600" />
            </div>

            <div>
              <h5 className="text-sm font-bold text-slate-800">২৪/৭ অনলাইন টেলিগ্রাম সাপোর্ট ইন্টিগ্রেশন</h5>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-normal mt-1 font-sans">
                আপনার ডিপোজিট, উইথড্র, কমিশন রিকোয়েস্ট অথবা এজেন্ট সার্ভার সংক্রান্ত যেকোনো প্রয়োজনে আমাদের অফিসিয়াল টেলিগ্রাম হেল্পডেস্কে সরাসরি যুক্ত হন।
              </p>
            </div>

            <a
              href="https://t.me/bdwalletagent"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-sky-600 hover:bg-sky-550 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 max-w-xs mx-auto transition shadow-sm cursor-pointer hover:scale-[1.01]"
            >
              টেলিগ্রাম চ্যাট শুরু করুন (@bdwalletagent)
              <ExternalLink className="w-4 h-4" />
            </a>

            <span className="text-[9.5px] text-slate-400 font-sans">অফিসিয়াল ইউজারনেমঃ <code className="text-sky-600 font-bold font-mono text-[11px]">t.me/bdwalletagent</code></span>
          </div>
        </ModalContainer>
      )}

      {/* 9. AGENT PROFILE MODAL */}
      {type === 'profile' && (
        <ModalContainer title="স্মার্ট এজেন্ট আইডি প্রোফাইল" onClose={onClose} errorMsg={errorMsg} successMsg={successMsg}>
          <form onSubmit={handleProfileUpdateSubmit} className="flex flex-col gap-5 font-sans text-slate-700">
            {/* Red-Only Identity Card */}
            <div className="p-5 rounded-2.5xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white flex flex-col gap-4 shadow-md relative overflow-hidden border border-slate-800">
              {/* Card gloss background highlights */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3.5 relative z-10">
                {/* Profile Avatar / Logo with Pulsing pipeline */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-inner border border-white/20 select-none uppercase">
                    {(profileName || agent.name || 'A').slice(0, 1)}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
                    <span className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </span>
                </div>

                {/* Identity Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-100 truncate">{profileName || agent.name}</span>
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full uppercase tracking-wide flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Verified Agent
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">আইডি:</span>
                    <code className="text-xs font-mono font-bold text-indigo-300">{agent.id.toUpperCase()}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(agent.id);
                        setIdCopied(true);
                        setTimeout(() => setIdCopied(false), 2000);
                      }}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      title="আইডি কপি করুন"
                    >
                      {idCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card stats and info divider */}
              <div className="h-px bg-slate-800" />

              {/* Core balance and commission credentials */}
              <div className="grid grid-cols-2 gap-2 relative z-10">
                <div className="bg-white/5 border border-white/5 p-2.5 rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">চলতি ব্যালেন্স</span>
                  <span className="text-sm font-black text-amber-400 font-sans">
                    ৳ {formatCurrency(agent.balance)}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/5 p-2.5 rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">কমিশন রেট</span>
                  <span className="text-[10.5px] font-extrabold text-[#229ED9] leading-5">
                    ডিপোজিট: ৩.০% | উইথড্র: ২.০%
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2.5xl border border-slate-150">
              <span className="text-[11px] font-black text-slate-505 uppercase tracking-wider block mb-1">অ্যাকাউন্ট ভেরিফিকেশন তথ্য</span>
              
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-505 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  এজেন্ট নাম
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-semibold text-slate-800 focus:ring-3 focus:ring-indigo-150"
                  placeholder="আপনার নাম লিখুন"
                  required
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-505 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-orange-650" />
                  মোবাইল নাম্বার
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-semibold text-slate-800 focus:ring-3 focus:ring-indigo-150"
                  placeholder="১১ ডিজিটের মোবাইল নাম্বার"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-505 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  ইমেইল এড্রেস
                </label>
                <input
                  type="type"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-semibold text-slate-800 focus:ring-3 focus:ring-indigo-150"
                  placeholder="আপনার ইমেইল অ্যাড্রেস"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* DOB */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold text-slate-505 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    জন্ম তারিখ
                  </label>
                  <input
                    type="date"
                    value={profileDob}
                    onChange={(e) => setProfileDob(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-semibold text-slate-800 focus:ring-3 focus:ring-indigo-150"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-extrabold text-slate-505 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    পাসওয়ার্ড পরিবর্তন করুন
                  </label>
                  <input
                    type="text"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none transition leading-normal font-semibold text-slate-800 focus:ring-3 focus:ring-indigo-150"
                    placeholder="পাসওয়ার্ড"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition hover:scale-[1.01] shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                তথ্য সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </ModalContainer>
      )}
    </AnimatePresence>
  );
}
