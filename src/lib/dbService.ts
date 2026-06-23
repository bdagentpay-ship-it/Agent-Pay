/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { Transaction, BalanceRequest, CommissionWithdrawal, NotificationItem, Agent, PlayerRequest } from '../types';

// Default mock/initial states for fallback & sync initialization
export const DEFAULT_AGENT: Agent = {
  id: "default_agent",
  name: "জনি এন্টারপ্রাইজ (এজেন্ট)",
  phone: "01789654123",
  balance: 0,
  commissionBalance: 0,
  todayDeposit: 0,
  todayWithdraw: 0,
  referralsCount: 0,
  referralEarnings: 0,
  referralCode: "AGPAY789"
};

export const IMRAN_AGENT: Agent = {
  id: "imran_agent",
  name: "ইমরান হোসেন (এজেন্ট)",
  phone: "01711223344",
  email: "imran@gmail.com",
  password: "1234",
  dob: "1995-05-15",
  balance: 35000,
  commissionBalance: 450,
  todayDeposit: 0,
  todayWithdraw: 0,
  referralsCount: 2,
  referralEarnings: 200,
  referralCode: "AGPAY112",
  limits: {
    dailyDeposit: 50000,
    weeklyDeposit: 250000,
    monthlyDeposit: 1000000,
    dailyWithdraw: 50000,
    weeklyWithdraw: 250000,
    monthlyWithdraw: 1000000
  }
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TX-1001",
    type: "deposit",
    playerId: "PL-99805",
    playerName: "শাকিব হাসান",
    amount: 15000,
    comPercent: 1.5,
    comAmount: 225,
    method: "bKash",
    timestamp: Date.now() - 1000 * 60 * 25, // 25 mins ago
    status: "completed",
    reference: "Deposit to 1xBet PIN"
  },
  {
    id: "TX-1002",
    type: "withdraw",
    playerId: "PL-45091",
    playerName: "তামিম ইকবাল",
    amount: 8000,
    comPercent: 1.0,
    comAmount: 80,
    method: "Nagad",
    timestamp: Date.now() - 1000 * 60 * 65, // 1h 5m ago
    status: "completed",
    reference: "Withdraw verification approved"
  },
  {
    id: "TX-1003",
    type: "deposit",
    playerId: "PL-23315",
    playerName: "মুশফিকুর রহিম",
    amount: 17000,
    comPercent: 1.5,
    comAmount: 255,
    method: "Rocket",
    timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    status: "completed",
    reference: "ID Reload"
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "N-101",
    title: "এজেন্ট পে অ্যাপে স্বাগতম!",
    body: "আমাদের উন্নত মোবাইল ট্রানজেকশন ড্যাশবোর্ড ও ক্লাউড ফায়াবেস সিঙ্ক সফলভাবে সংযুক্ত হয়েছে।",
    timestamp: Date.now() - 1000 * 60 * 120,
    read: false,
    type: "general"
  },
  {
    id: "N-102",
    title: "উইথড্র সম্পন্ন হয়েছে",
    body: "খেলোয়াড় PL-45091 থেকে ৮,০০০ টাকা উইথড্র করা হয়েছে। আপনার অর্জিত কমিশন ৮০ টাকা।",
    timestamp: Date.now() - 1000 * 60 * 65,
    read: true,
    type: "withdraw"
  },
  {
    id: "N-103",
    title: "ডিপোজিট সফল",
    body: "খেলোয়াড় PL-99805 কে ১৫,০০০ টাকা ডিপোজিট করা হয়েছে। আপনার অর্জিত কমিশন ২২৫ টাকা।",
    timestamp: Date.now() - 1000 * 60 * 25,
    read: false,
    type: "deposit"
  }
];

export const INITIAL_BALANCE_REQUESTS: BalanceRequest[] = [
  {
    id: "REQ-101",
    amount: 50000,
    method: "Bank",
    senderNumber: "City Bank *432",
    txid: "CB9804213504",
    timestamp: Date.now() - 1000 * 60 * 300,
    status: "approved"
  },
  {
    id: "REQ-102",
    amount: 25000,
    method: "Nagad",
    senderNumber: "01912345678",
    txid: "NG123985790",
    timestamp: Date.now() - 1000 * 60 * 15,
    status: "pending"
  }
];

export const INITIAL_COMM_WITHDRAWALS: CommissionWithdrawal[] = [
  {
    id: "CW-101",
    amount: 15000,
    method: "main_balance",
    timestamp: Date.now() - 1000 * 60 * 1440, // 1 day ago
    status: "completed"
  }
];

// Local Storage Helper to mirror states
export const loadLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const val = localStorage.getItem(`agentpay_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const saveLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`agentpay_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage error:", e);
  }
};

export const generateInitialPlayerPool = (type: 'deposit' | 'withdraw'): PlayerRequest[] => {
  const pool: PlayerRequest[] = [];
  const sites = ["1xBet", "Linebet", "Melbet", "Megapari", "BetWinner", "Baji Live"];
  const methods: ('bKash' | 'Nagad' | 'Rocket' | 'Upay')[] = ["bKash", "Nagad", "Rocket", "Upay"];
  const prefixes = ["017", "018", "019", "016", "015", "013"];

  const tiers = [
    { amount: 300, count: 50 },
    { amount: 500, count: 50 },
    { amount: 1000, count: 30 },
    { amount: 1500, count: 20 },
    { amount: 5000, count: 10 }
  ];

  let idCounter = 1;

  tiers.forEach(tier => {
    for (let i = 0; i < tier.count; i++) {
      const siteName = sites[Math.floor(Math.random() * sites.length)];
      const paymentMethod = methods[Math.floor(Math.random() * methods.length)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      
      // E.g., prefix + 8 digits = 11 digits
      let randDigits = '';
      for (let d = 0; d < 8; d++) {
        randDigits += Math.floor(Math.random() * 10).toString();
      }
      const senderNumber = prefix + randDigits;
      const playerId = "PL" + Math.floor(100000 + Math.random() * 900000);
      
      let txid = undefined;
      if (type === 'deposit') {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        txid = '8'; // start with 8 for bKash style
        for (let x = 0; x < 9; x++) {
          txid += letters.charAt(Math.floor(Math.random() * letters.length));
        }
      }

      pool.push({
        id: `${type === 'deposit' ? 'DEP' : 'WD'}-${1000 + idCounter++}`,
        type,
        siteName,
        playerId,
        paymentMethod,
        senderNumber,
        txid,
        amount: tier.amount,
        status: 'pending',
        timestamp: Date.now()
      });
    }
  });

  return pool;
};

