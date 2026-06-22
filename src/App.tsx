/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  app, 
  db 
} from './lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Agent, 
  Transaction, 
  BalanceRequest, 
  CommissionWithdrawal, 
  NotificationItem,
  PlayerRequest
} from './types';
import { 
  DEFAULT_AGENT, 
  INITIAL_TRANSACTIONS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_BALANCE_REQUESTS, 
  INITIAL_COMM_WITHDRAWALS,
  loadLocalData,
  saveLocalData,
  generateInitialPlayerPool
} from './lib/dbService';

import Header from './components/Header';
import QuickMenu from './components/QuickMenu';
import NotificationCenter from './components/NotificationCenter';
import Modals from './components/Modals';

import { 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Smartphone, 
  Users, 
  Building 
} from 'lucide-react';

export default function App() {
  // Authentication & Session States
  const [isLogged, setIsLogged] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('default_agent');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Login form states
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Registration form states
  const [agentNameInput, setAgentNameInput] = useState('');
  const [agentPhoneInput, setAgentPhoneInput] = useState('');
  const [agentDobInput, setAgentDobInput] = useState('');
  const [agentEmailInput, setAgentEmailInput] = useState('');
  const [agentPasswordInput, setAgentPasswordInput] = useState('');
  const [agentReferralInput, setAgentReferralInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Main Application States
  const [agent, setAgent] = useState<Agent>(DEFAULT_AGENT);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [balanceRequests, setBalanceRequests] = useState<BalanceRequest[]>([]);
  const [commissionWithdrawals, setCommissionWithdrawals] = useState<CommissionWithdrawal[]>([]);

  // Player request pools & timers
  const [playerRequests, setPlayerRequests] = useState<PlayerRequest[]>([]);
  const [playerRequestsPool, setPlayerRequestsPool] = useState<PlayerRequest[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);

  // Admin Link Auth State
  const [adminRequestId, setAdminRequestId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('request_id');
  });
  const [isAdminAuthLogged, setIsAdminAuthLogged] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // System States
  const [isFirebaseSynced, setIsFirebaseSynced] = useState(true);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // 1. Initial Load of Local States fallback
  useEffect(() => {
    // Attempt local storage loadings
    const localAgent = loadLocalData<Agent>('agent', { ...DEFAULT_AGENT, id: selectedAgentId });
    const localAllAgents = loadLocalData<Agent[]>('all_agents', [DEFAULT_AGENT]);
    const localTransactions = loadLocalData<Transaction[]>('transactions', INITIAL_TRANSACTIONS);
    const localNotifications = loadLocalData<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
    const localRequests = loadLocalData<BalanceRequest[]>('balance_requests', INITIAL_BALANCE_REQUESTS);
    const localWithdrawals = loadLocalData<CommissionWithdrawal[]>('commission_withdrawals', INITIAL_COMM_WITHDRAWALS);

    setAgent(localAgent);
    setAllAgents(localAllAgents);
    setTransactions(localTransactions);
    setNotifications(localNotifications);
    setBalanceRequests(localRequests);
    setCommissionWithdrawals(localWithdrawals);
  }, [selectedAgentId]);

  // 1b. Helper: Trigger New Player Offering
  const triggerNewRandomPlayerRequest = useCallback((manualType?: 'deposit' | 'withdraw') => {
    const chosenType = manualType || (Math.random() > 0.4 ? 'deposit' : 'withdraw');
    
    if (chosenType === 'deposit' && agent.balance < 300) {
      return;
    }
    
    // Reload pools from local storage
    const currentPool = loadLocalData<PlayerRequest[]>('player_requests_pool', []);
    const templates = currentPool.filter(r => r.type === chosenType && r.status === 'pending');
    if (templates.length === 0) return;
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const remainingPool = currentPool.filter(r => r.id !== randomTemplate.id);
    setPlayerRequestsPool(remainingPool);
    saveLocalData('player_requests_pool', remainingPool);
    
    const activeReq: PlayerRequest = {
      ...randomTemplate,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    const currentActive = loadLocalData<PlayerRequest[]>('player_requests', []);
    const updatedActive = [activeReq, ...currentActive];
    setPlayerRequests(updatedActive);
    saveLocalData('player_requests', updatedActive);
    
    const newNotif: NotificationItem = {
      id: `N-AUTO-${chosenType}-${Date.now()}`,
      title: chosenType === 'deposit' ? "নতুন ডিপোজিট অনুরোধ! 📥" : "নতুন উইথড্র অনুরোধ! 📤",
      body: `খেলোয়াড় ${activeReq.playerId} থেকে ৳${activeReq.amount.toLocaleString('bn-BD')} টাকার অনুরোধ এসেছে। সাইটঃ ${activeReq.siteName}`,
      timestamp: Date.now(),
      read: false,
      type: chosenType
    };
    appendNotification(newNotif);
  }, [playerRequestsPool, playerRequests, agent]);

  // 1c. Initial Load of Player Pools & Seed Queue
  useEffect(() => {
    const savedActive = loadLocalData<PlayerRequest[]>('player_requests', []);
    const savedPool = loadLocalData<PlayerRequest[]>('player_requests_pool', []);
    
    let active = [...savedActive];
    let pool = [...savedPool];
    
    if (pool.length === 0) {
      const depPool = generateInitialPlayerPool('deposit');
      const wdPool = generateInitialPlayerPool('withdraw');
      pool = [...depPool, ...wdPool];
      saveLocalData('player_requests_pool', pool);
    }
    
    const activeDeposits = active.filter(r => r.type === 'deposit');
    const activeWithdrawals = active.filter(r => r.type === 'withdraw');
    
    let poolModified = false;
    let activeModified = false;
    
    if (activeDeposits.length === 0) {
      const idx = pool.findIndex(r => r.type === 'deposit' && r.status === 'pending');
      if (idx !== -1) {
        const req = { ...pool[idx], timestamp: Date.now() };
        pool.splice(idx, 1);
        active.push(req);
        
        const newNotif: NotificationItem = {
          id: "N-DEP-" + Date.now(),
          title: "নতুন ডিপোজিট অনুরোধ এসেছে! 📥",
          body: `খেলোয়াড় ${req.playerId} থেকে ${req.amount} টাকার ডিপোজিট অনুরোধ এসেছে। সাইটঃ ${req.siteName}`,
          timestamp: Date.now(),
          read: false,
          type: 'deposit'
        };
        appendNotification(newNotif);
        
        poolModified = true;
        activeModified = true;
      }
    }
    
    if (activeWithdrawals.length === 0) {
      const idx = pool.findIndex(r => r.type === 'withdraw' && r.status === 'pending');
      if (idx !== -1) {
        const req = { ...pool[idx], timestamp: Date.now() };
        pool.splice(idx, 1);
        active.push(req);
        
        const newNotif: NotificationItem = {
          id: "N-WD-" + Date.now(),
          title: "নতুন উইথড্র অনুরোধ এসেছে! 📤",
          body: `খেলোয়াড় ${req.playerId} থেকে ${req.amount} টাকার উইথড্র অনুরোধ এসেছে। সাইটঃ ${req.siteName}`,
          timestamp: Date.now(),
          read: false,
          type: 'withdraw'
        };
        appendNotification(newNotif);
        
        poolModified = true;
        activeModified = true;
      }
    }
    
    if (poolModified) {
      setPlayerRequestsPool(pool);
      saveLocalData('player_requests_pool', pool);
    }
    if (activeModified) {
      setPlayerRequests(active);
      saveLocalData('player_requests', active);
    }
  }, []);

  // 1d. Background countdown timer for automatic player requests matching
  useEffect(() => {
    if (!isLogged) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          triggerNewRandomPlayerRequest();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isLogged, triggerNewRandomPlayerRequest]);

  // 1e. Auto-approval timer for Commission Withdraw requests (exactly 1 minute)
  useEffect(() => {
    const listToApprove = commissionWithdrawals.filter(w => w.status === 'pending');
    if (listToApprove.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let modified = false;
      const updatedList = commissionWithdrawals.map(w => {
        if (w.status === 'pending' && now - (w.timestamp || 0) >= 60000) {
          modified = true;
          const nextAgent = {
            ...agent,
            commissionBalance: Math.max(0, agent.commissionBalance - w.amount)
          };
          setAgent(nextAgent);
          saveLocalData('agent', nextAgent);
          updateFirebaseDoc('agents', nextAgent.id, nextAgent);

          const newNotif: NotificationItem = {
            id: "N-CW-APPROVED-" + Date.now(),
            title: "কমিশন উত্তোলন অনুমোদিত! 💸",
            body: `আপনার ৳${w.amount.toLocaleString('bn-BD')} টাকার কমিশন উত্তোলন আবেদন (ID: ${w.id}) স্বয়ংক্রিয়ভাবে অনুমোদিত ও পেইড করা হয়েছে।`,
            timestamp: Date.now(),
            read: false,
            type: 'commission'
          };
          appendNotification(newNotif);

          return { ...w, status: 'completed' as const };
        }
        return w;
      });

      if (modified) {
        setCommissionWithdrawals(updatedList);
        saveLocalData('commission_withdrawals', updatedList);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [commissionWithdrawals, agent]);

  // 2. Real-time Firebase listeners with automatic local synchronization fallback
  useEffect(() => {
    if (!db) {
      setIsFirebaseSynced(false);
      return;
    }

    let unsubAgent: () => void = () => {};
    let unsubTrans: () => void = () => {};
    let unsubNotif: () => void = () => {};
    let unsubReqs: () => void = () => {};
    let unsubAllAgents: () => void = () => {};

    try {
      // Listener 1: Agent Document
      const agentDocRef = doc(db, 'agents', selectedAgentId);
      unsubAgent = onSnapshot(agentDocRef, (snap) => {
        if (snap.exists()) {
          const fetchedAgent = snap.data() as Agent;
          setAgent(fetchedAgent);
          saveLocalData('agent', fetchedAgent);
        } else {
          // If first time, write default data to cloud
          setDoc(agentDocRef, { ...DEFAULT_AGENT, id: selectedAgentId });
        }
        setIsFirebaseSynced(true);
      }, (err) => {
        console.warn("Firestore agent listen blocked/disabled. Running local mode.", err);
        setIsFirebaseSynced(false);
      });

      // Listener 2: Transactions Collection (Filtered by agent)
      const transColRef = collection(db, 'transactions');
      unsubTrans = onSnapshot(transColRef, (snap) => {
        const list: Transaction[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as Transaction;
          list.push(data);
        });
        
        // Sort by timestamp desc
        const sorted = list.sort((a,b) => b.timestamp - a.timestamp);
        if (sorted.length > 0) {
          setTransactions(sorted);
          saveLocalData('transactions', sorted);
        }
      }, (err) => {
        setIsFirebaseSynced(false);
      });

      // Listener 3: Balance Requests
      const reqColRef = collection(db, 'balance_requests');
      unsubReqs = onSnapshot(reqColRef, (snap) => {
        const list: BalanceRequest[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as BalanceRequest);
        });
        const sorted = list.sort((a,b) => b.timestamp - a.timestamp);
        if (sorted.length > 0) {
          setBalanceRequests(sorted);
          saveLocalData('balance_requests', sorted);
        }
      }, (err) => {
        setIsFirebaseSynced(false);
      });

      // Listener 4: Notifications
      const notifColRef = collection(db, 'notifications');
      unsubNotif = onSnapshot(notifColRef, (snap) => {
        const list: NotificationItem[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as NotificationItem);
        });
        const sorted = list.sort((a,b) => b.timestamp - a.timestamp);
        if (sorted.length > 0) {
          setNotifications(sorted);
          saveLocalData('notifications', sorted);
        }
      }, (err) => {
        setIsFirebaseSynced(false);
      });

      // Listener 5: All Registered Agent Profiles
      const agentsColRef = collection(db, 'agents');
      unsubAllAgents = onSnapshot(agentsColRef, (snap) => {
        const list: Agent[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as Agent);
        });
        // Sort: make default agent show first in lists
        const sorted = list.sort((a, b) => (a.id === 'default_agent' ? -1 : b.id === 'default_agent' ? 1 : 0));
        if (sorted.length > 0) {
          setAllAgents(sorted);
          saveLocalData('all_agents', sorted);
        }
      }, (err) => {
        console.warn("Firestore all_agents listen blocked:", err);
      });

    } catch (e) {
      console.error("Firebase setup listeners error:", e);
      setIsFirebaseSynced(false);
    }

    // Cleanup inside destroy loop
    return () => {
      unsubAgent();
      unsubTrans();
      unsubReqs();
      unsubNotif();
      unsubAllAgents();
    };
  }, [selectedAgentId]);

  // Sync state modifications safely across both channels
  const updateFirebaseDoc = async (col: string, docId: string, data: any) => {
    try {
      if (isFirebaseSynced && db) {
        await setDoc(doc(db, col, docId), data);
      }
    } catch (e) {
      console.warn(`Cloud save failed for ${col}/${docId}. Offline mirror utilized.`, e);
    }
  };

  // Push local modification
  const appendTransaction = (newTrans: Transaction) => {
    const updated = [newTrans, ...transactions];
    setTransactions(updated);
    saveLocalData('transactions', updated);
    updateFirebaseDoc('transactions', newTrans.id, newTrans);
  };

  const appendNotification = (newNotif: NotificationItem) => {
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveLocalData('notifications', updated);
    updateFirebaseDoc('notifications', newNotif.id, newNotif);
  };

  const appendBalanceRequest = (newReq: BalanceRequest) => {
    const updated = [newReq, ...balanceRequests];
    setBalanceRequests(updated);
    saveLocalData('balance_requests', updated);
    updateFirebaseDoc('balance_requests', newReq.id, newReq);
  };

  const updateAgentState = (updatedAgent: Agent) => {
    setAgent(updatedAgent);
    saveLocalData('agent', updatedAgent);
    updateFirebaseDoc('agents', updatedAgent.id, updatedAgent);
  };

  const handleResolvePlayerRequest = (id: string, status: 'approved' | 'rejected') => {
    const request = playerRequests.find(r => r.id === id);
    if (!request) return;

    // Update active player request status
    const updatedRequests = playerRequests.map(r => r.id === id ? { ...r, status } : r);
    setPlayerRequests(updatedRequests);
    saveLocalData('player_requests', updatedRequests);

    // If approved, trigger transaction log as completed & adjust balances
    if (status === 'approved') {
      if (request.type === 'deposit') {
        const comAmount = request.amount * 0.03; // 3.0% commission
        
        // Deduct player deposit request amount from agent main balance, add 3.0% commission
        const nextAgent: Agent = {
          ...agent,
          balance: Math.max(0, agent.balance - request.amount),
          commissionBalance: agent.commissionBalance + comAmount,
          todayDeposit: agent.todayDeposit + request.amount
        };
        updateAgentState(nextAgent);

        // Record completed transaction
        const newTrans: Transaction = {
          id: request.id,
          type: 'deposit',
          playerId: request.playerId,
          playerName: 'প্লেয়ার (' + request.playerId + ')',
          amount: request.amount,
          comPercent: 3.0,
          comAmount,
          method: request.paymentMethod,
          timestamp: Date.now(),
          status: 'completed',
          agentId: agent.id,
          siteName: request.siteName,
          senderNumber: request.senderNumber,
          txid: request.txid
        };
        appendTransaction(newTrans);

        // Add success notification
        const newNotif: NotificationItem = {
          id: "N-DEP-OK-" + Date.now(),
          title: "ডিপোজিট অনুরোধ সফল! 📥",
          body: `খেলোয়াড় ${request.playerId} কে ৳${request.amount.toLocaleString('bn-BD')} টাকা পাঠানো হয়েছে। অর্জিত কমিশন: ৳${comAmount.toLocaleString('bn-BD')}`,
          timestamp: Date.now(),
          read: false,
          type: 'deposit'
        };
        appendNotification(newNotif);

      } else {
        // withdraw approval
        const comAmount = request.amount * 0.02; // 2.0% commission
        
        // Add request amount to agent main balance (cash received from player), add 2% commission
        const nextAgent: Agent = {
          ...agent,
          balance: agent.balance + request.amount,
          commissionBalance: agent.commissionBalance + comAmount,
          todayWithdraw: agent.todayWithdraw + request.amount
        };
        updateAgentState(nextAgent);

        // Record completed transaction
        const newTrans: Transaction = {
          id: request.id,
          type: 'withdraw',
          playerId: request.playerId,
          playerName: 'প্লেয়ার (' + request.playerId + ')',
          amount: request.amount,
          comPercent: 2.0,
          comAmount,
          method: request.paymentMethod,
          timestamp: Date.now(),
          status: 'completed',
          agentId: agent.id,
          siteName: request.siteName,
          senderNumber: request.senderNumber
        };
        appendTransaction(newTrans);

        // Success notification
        const newNotif: NotificationItem = {
          id: "N-WD-OK-" + Date.now(),
          title: "উইথড্রয়াল অনুরোধ অনুমোদিত! 📤",
          body: `খেলোয়াড় ${request.playerId} থেকে ৳${request.amount.toLocaleString('bn-BD')} ক্যাশআউট সফল হয়েছে। অর্জিত কমিশন: ৳${comAmount.toLocaleString('bn-BD')}`,
          timestamp: Date.now(),
          read: false,
          type: 'withdraw'
        };
        appendNotification(newNotif);
      }
    } else {
      // If rejected
      const newNotif: NotificationItem = {
        id: "N-REJ-" + Date.now(),
        title: `${request.type === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'} বাতিল করা হয়েছে 🚫`,
        body: `খেলোয়াড় ${request.playerId} এর ৳${request.amount.toLocaleString('bn-BD')} টাকার অনুরোধটি বাতিল করা হয়েছে।`,
        timestamp: Date.now(),
        read: false,
        type: 'general'
      };
      appendNotification(newNotif);
    }
  };

  // Convert English digits to Bengali digits helper
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

  // TRANSACTION ACTIONS
  // 1. Deposit Action
  const handleDepositSubmit = (
    playerId: string, 
    playerName: string, 
    amount: number, 
    method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', 
    comPercent: number
  ) => {
    const comAmount = amount * (comPercent / 100);
    const txId = "DEP-" + Math.floor(100000 + Math.random() * 900000);

    // Update balances
    const nextAgent: Agent = {
      ...agent,
      balance: agent.balance - amount,
      commissionBalance: agent.commissionBalance + comAmount,
      todayDeposit: agent.todayDeposit + amount
    };
    updateAgentState(nextAgent);

    // Create transaction log
    const newTrans: Transaction = {
      id: txId,
      type: 'deposit',
      playerId,
      playerName,
      amount,
      comPercent,
      comAmount,
      method,
      timestamp: Date.now(),
      status: 'completed',
      agentId: agent.id
    };
    appendTransaction(newTrans);

    // Create automated notification
    const newNotif: NotificationItem = {
      id: "N-" + Date.now(),
      title: "ডিপোজিট সফল হয়েছে!",
      body: `খেলোয়াড় ${playerId} কে ৳${amount.toLocaleString('bn-BD')} টাকা পাঠানো হয়েছে (${method})। আপনার অর্জিত কমিশন ৳${comAmount.toLocaleString('bn-BD')} টাকা।`,
      timestamp: Date.now(),
      read: false,
      type: 'deposit'
    };
    appendNotification(newNotif);
  };

  // 2. Withdraw Action
  const handleWithdrawSubmit = (
    playerId: string, 
    playerName: string, 
    amount: number, 
    method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', 
    comPercent: number
  ) => {
    const comAmount = amount * (comPercent / 100);
    const txId = "WD-" + Math.floor(100000 + Math.random() * 900000);

    // Update balances (increases main balance since mobile banking cashing out to agent)
    const nextAgent: Agent = {
      ...agent,
      balance: agent.balance + amount,
      commissionBalance: agent.commissionBalance + comAmount,
      todayWithdraw: agent.todayWithdraw + amount
    };
    updateAgentState(nextAgent);

    // Create transaction log
    const newTrans: Transaction = {
      id: txId,
      type: 'withdraw',
      playerId,
      playerName,
      amount,
      comPercent,
      comAmount,
      method,
      timestamp: Date.now(),
      status: 'completed',
      agentId: agent.id
    };
    appendTransaction(newTrans);

    // Create automated notification
    const newNotif: NotificationItem = {
      id: "N-" + Date.now(),
      title: "উইথড্রয়াল প্রসেস সফল!",
      body: `খেলোয়াড় ${playerId} থেকে ৳${amount.toLocaleString('bn-BD')} টাকা উইথড্র গ্রহণ করা হয়েছে। ক্যাশ ফি কমিশন ৳${comAmount.toLocaleString('bn-BD')} মেইন অ্যাকাউন্টে যোগ করা হয়েছে।`,
      timestamp: Date.now(),
      read: false,
      type: 'withdraw'
    };
    appendNotification(newNotif);
  };

  // 3. Balance request to system
  const handleBalanceRequestSubmit = (
    amount: number, 
    method: 'bKash' | 'Nagad' | 'Rocket' | 'Bank', 
    senderNumber: string, 
    txid: string,
    customAgentId?: string,
    screenshotUrl?: string
  ): string => {
    const reqId = "REQ-" + Math.floor(10000 + Math.random() * 90000);
    
    const newReq: BalanceRequest = {
      id: reqId,
      amount,
      method,
      senderNumber,
      txid,
      timestamp: Date.now(),
      status: 'pending',
      agentId: customAgentId || agent.id || 'default_agent',
      screenshotUrl: screenshotUrl || ''
    };
    appendBalanceRequest(newReq);

    // Push state notice
    const newNotif: NotificationItem = {
      id: "N-" + Date.now(),
      title: "ব্যালেন্স রিকোয়েস্ট পেন্ডিং!",
      body: `আপনার ${amount.toLocaleString('bn-BD')} টাকার ব্যালেন্স রিচার্জ রিকোয়েস্ট সাবমিট করা হয়েছে। অনুগ্রহ করে গেটওয়ে ভেরিফিকেশনের জন্য অপেক্ষা করুন।`,
      timestamp: Date.now(),
      read: false,
      type: 'balance'
    };
    appendNotification(newNotif);

    return reqId;
  };

  // 4. Commission Withdrawal / Conversion
  const handleCommissionWithdrawal = (
    amount: number, 
    method: 'main_balance' | 'mobile_banking', 
    mobileMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', 
    receiverNum?: string
  ) => {
    if (method === 'main_balance') {
      // Directly add to main balance
      const nextAgent: Agent = {
        ...agent,
        balance: agent.balance + amount,
        commissionBalance: agent.commissionBalance - amount
      };
      updateAgentState(nextAgent);

      const newNotif: NotificationItem = {
        id: "N-" + Date.now(),
        title: "কমিশন ওয়ালেট কনভার্ট সফল!",
        body: `৳${amount.toLocaleString('bn-BD')} কমিশন ফান্ড থেকে মূল ব্যালেন্স লেজারে ট্রান্সফার করা হয়েছে। কোনো সার্ভিস চার্জ কাটা হয়নি।`,
        timestamp: Date.now(),
        read: false,
        type: 'commission'
      };
      appendNotification(newNotif);
    } else {
      // Mobile banking withdrawal request (simulated complete)
      const nextAgent: Agent = {
        ...agent,
        commissionBalance: agent.commissionBalance - amount
      };
      updateAgentState(nextAgent);

      const newNotif: NotificationItem = {
        id: "N-" + Date.now(),
        title: "কমিশন ক্যাশআউট সম্পাদন!",
        body: `৳${amount.toLocaleString('bn-BD')} কমিশন আপনি ${mobileMethod} পারসোনাল নম্বর ${receiverNum} এ উত্তোলনের আবেদন করেছেন। ২০ মিনিটের মধ্যে ক্যাশ সম্পন্ন হবে।`,
        timestamp: Date.now(),
        read: false,
        type: 'commission'
      };
      appendNotification(newNotif);
    }
  };

  // 5. Admin Simulator Actions (Approve / Reject)
  const handleApproveRequest = (id: string) => {
    const updatedReqs = balanceRequests.map((r) => {
      if (r.id === id) {
        // Find target agent ID and update their specific balance in Firestore
        const targetAgentId = r.agentId || agent.id || 'default_agent';
        const targetAgent = allAgents.find(a => a.id === targetAgentId) || agent;
        
        const nextAgent: Agent = {
          ...targetAgent,
          balance: targetAgent.balance + r.amount
        };
        
        // Save target agent to Firestore vs local state
        if (targetAgentId === agent.id) {
          updateAgentState(nextAgent);
        } else {
          updateFirebaseDoc('agents', targetAgentId, nextAgent);
        }

        // Push alert
        const newNotif: NotificationItem = {
          id: "N-" + Date.now(),
          title: "ব্যালেন্স রিকোয়েস্ট অনুমোদিত!",
          body: `অভিনন্দন! আপনার ৳${r.amount.toLocaleString('bn-BD')} টাকার ব্যালেন্স রিচার্জ রিকোয়েস্ট (ID: ${r.id}) অ্যাডমিন গেটওয়ে দ্বারা অনুমোদিত ও ওয়ালেটে ক্যাশপিন নিশ্চিত করা হয়েছে।`,
          timestamp: Date.now(),
          read: false,
          type: 'balance'
        };
        appendNotification(newNotif);

        return { ...r, status: 'approved' as const };
      }
      return r;
    });

    setBalanceRequests(updatedReqs);
    saveLocalData('balance_requests', updatedReqs);
    
    // Save to Cloud
    const approvedTarget = updatedReqs.find(r => r.id === id);
    if (approvedTarget) {
      updateFirebaseDoc('balance_requests', id, approvedTarget);
    }
  };

  const handleRejectRequest = (id: string) => {
    const updatedReqs = balanceRequests.map((r) => {
      if (r.id === id) {
        const newNotif: NotificationItem = {
          id: "N-" + Date.now(),
          title: "ব্যালেন্স রিকোয়েস্ট বাতিল করা হয়েছে",
          body: `আপনার প্রেরিত ৳${r.amount.toLocaleString('bn-BD')} টাকা রিকোয়েস্ট (TxID: ${r.txid}) বাতিল হয়েছে। অনুগ্রহ করে হেল্পডেস্কে যোগাযোগ করুন।`,
          timestamp: Date.now(),
          read: false,
          type: 'general'
        };
        appendNotification(newNotif);

        return { ...r, status: 'rejected' as const };
      }
      return r;
    });

    setBalanceRequests(updatedReqs);
    saveLocalData('balance_requests', updatedReqs);
    
    const rejectedTarget = updatedReqs.find(r => r.id === id);
    if (rejectedTarget) {
      updateFirebaseDoc('balance_requests', id, rejectedTarget);
    }
  };

  const handleUpdateAgentLimits = async (agentId: string, limits: any) => {
    try {
      if (db) {
        const agentDocRef = doc(db, 'agents', agentId);
        await updateDoc(agentDocRef, { limits });
      }
      
      // Update local setAllAgents
      const updatedAll = allAgents.map(a => a.id === agentId ? { ...a, limits } : a);
      setAllAgents(updatedAll);
      saveLocalData('all_agents', updatedAll);

      if (agentId === selectedAgentId) {
        const nextAgent = { ...agent, limits };
        setAgent(nextAgent);
        saveLocalData('agent', nextAgent);
      }

      // Append safe push alert notice
      const newNotif: NotificationItem = {
        id: "N-" + Date.now(),
        title: "লেনদেনের সীমা আপডেট করা হয়েছে",
        body: `অ্যাডমিন পোর্টাল থেকে আপনার ওয়ালেটের লেনদেন সীমা সফলভাবে হালনাগাদ করা হয়েছে।`,
        timestamp: Date.now(),
        read: false,
        type: 'general'
      };
      appendNotification(newNotif);
    } catch (e) {
      console.error("Limits save rejected: ", e);
    }
  };

  // Refresh Trigger
  const handleRefreshData = () => {
    // Standard triggers. Local Storage is loaded, listen subscription will refresh.
    saveLocalData('agent', agent);
  };

  // NOTIFICATION UTILITIES
  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveLocalData('notifications', updated);
    if (isFirebaseSynced && db) {
      updated.forEach((n) => {
        updateFirebaseDoc('notifications', n.id, n);
      });
    }
  };

  const handleMarkRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveLocalData('notifications', updated);
    const target = updated.find(n => n.id === id);
    if (target) {
      updateFirebaseDoc('notifications', id, target);
    }
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
    saveLocalData('notifications', []);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingRequests = balanceRequests.filter(r => r.status === 'pending');

  // AGENT SIMULATED SECURE ACCESS GATEWAY
  const handleProfileSelect = (agentId: string) => {
    const matchingAgent = allAgents.find(a => a.id === agentId);
    if (matchingAgent) {
      setAgent(matchingAgent);
    }
    setSelectedAgentId(agentId);
    setIsLogged(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPassword) {
      setLoginError('জিমেইল/মোবাইল নাম্বার এবং পাসওয়ার্ড অবশ্যই লিখুন!');
      return;
    }

    const matched = allAgents.find(a => 
      (a.email?.toLowerCase().trim() === loginUser.toLowerCase().trim() || a.phone?.trim() === loginUser.trim()) &&
      (a.password === loginPassword || (!a.password && loginPassword === '123456'))
    );

    if (matched) {
      setAgent(matched);
      setSelectedAgentId(matched.id);
      setIsLogged(true);
      setLoginError('');
      
      const newNotif: NotificationItem = {
        id: "N-" + Date.now(),
        title: "লগইন সফল হয়েছে!",
        body: `স্বাগতম ${matched.name}! আপনি সফলভাবে পোর্টাল সেশনে লগইন করেছেন।`,
        timestamp: Date.now(),
        read: false,
        type: 'general'
      };
      appendNotification(newNotif);
    } else {
      setLoginError('ভুল জিমেইল/মোবাইল অথবা পাসওয়ার্ড প্রদান করা হয়েছে!');
    }
  };

  const handleRegisterAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentNameInput || !agentPhoneInput || !agentEmailInput || !agentPasswordInput || !agentDobInput) {
      setLoginError('রেজিস্ট্রেশনের জন্য সবগুলি তারকা চিহ্নিত ঘর পূরণ করা আবশ্যক!');
      return;
    }

    // Unique Agent ID generation (AG-22879)
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const customId = `AG-${randNum}`;

    const defaultLimits = {
      dailyDeposit: 50000,
      weeklyDeposit: 250000,
      monthlyDeposit: 1000000,
      dailyWithdraw: 50000,
      weeklyWithdraw: 250000,
      monthlyWithdraw: 1000000,
    };

    const customAgent: Agent = {
      id: customId,
      name: agentNameInput,
      phone: agentPhoneInput,
      email: agentEmailInput,
      dob: agentDobInput,
      password: agentPasswordInput,
      balance: 0, // Initial balance is 0 as requested (no demo balance)
      commissionBalance: 0,
      todayDeposit: 0,
      todayWithdraw: 0,
      referralsCount: agentReferralInput ? 1 : 0,
      referralEarnings: agentReferralInput ? 100 : 0,
      referralCode: "AGPAY" + randNum,
      limits: defaultLimits
    };

    setAgent(customAgent);
    setSelectedAgentId(customId);
    
    // Add to allAgents list
    const updatedList = [customAgent, ...allAgents.filter(a => a.id !== customId)];
    setAllAgents(updatedList);
    saveLocalData('all_agents', updatedList);
    saveLocalData('agent', customAgent);
    
    updateFirebaseDoc('agents', customId, customAgent);
    
    // Register automatic welcome notification
    const newNotif: NotificationItem = {
      id: "N-" + Date.now(),
      title: "রেজিস্ট্রেশন সফল হয়েছে!",
      body: `স্বাগতম ${agentNameInput}! এজেন্ট পে ওয়ালেটে আপনার রেজিস্ট্রেশন নিশ্চিত করা হয়েছে। আইডিঃ ${customId}। আপনার জন্য দৈনিক ৳৫০,০০০ টাকা লেনদেন সীমা বরাদ্দ করা হয়েছে।`,
      timestamp: Date.now(),
      read: false,
      type: 'general'
    };
    appendNotification(newNotif);

    setIsLogged(true);
    setLoginError('');
  };

  const handleLogout = () => {
    setIsLogged(false);
    setLoginPassword('');
    setActiveModal(null);
  };

  const handleUpdateProfile = async (updatedFields: Partial<Agent>) => {
    const updatedAgent = { ...agent, ...updatedFields };
    setAgent(updatedAgent);
    saveLocalData('agent', updatedAgent);

    const updatedList = allAgents.map(a => a.id === agent.id ? updatedAgent : a);
    setAllAgents(updatedList);
    saveLocalData('all_agents', updatedList);

    await updateFirebaseDoc('agents', agent.id, updatedAgent);
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-start pt-4 px-2 sm:px-4 pb-12 font-sans overflow-y-auto no-scrollbar selection:bg-blue-500/25 bg-slate-50/50">
      
      {/* Visual background decor rings */}
      <div className="fixed top-20 left-10 w-48 h-48 rounded-full bg-blue-600/5 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-20 right-10 w-64 h-64 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none"></div>

      <AnimatePresence mode="wait">
        
        {/* ADMIN PORTAL GATEWAY FOR SHARED VERIFICATION LINKS */}
        {adminRequestId ? (
          <motion.div
            key="admin-portal"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-3xl mt-5 shadow-xl flex flex-col gap-5 font-sans"
          >
            <div className="text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-2 shadow-xs">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight font-display">এডমিন সিকিউর অ্যাক্সেস পোর্টাল</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">সিকিউর এজেন্ট ডিপোজিট ভেরিফিকেশন হাব</p>
            </div>

            {!isAdminAuthLogged ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminEmail.trim() === 'bdagentpay@gmail.com' && adminPassword === '1234567890') {
                    setIsAdminAuthLogged(true);
                    setAdminLoginError('');
                  } else {
                    setAdminLoginError('ভুল অ্যাডমিন ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।');
                  }
                }}
                className="flex flex-col gap-3.5"
              >
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl leading-relaxed">
                  🔐 <strong>নিরাপত্তা নোটিশ:</strong> এই লিঙ্কটি শুধুমাত্র এজেন্টের ব্যালেন্স অনুরোধ অ্যাপ্রুভ করার জন্য। অনুগ্রহ করে ড্যাশবোর্ডের দেওয়া অ্যাডমিন পাসওয়ার্ড দিয়ে সিকিউরিটি ভেরিফিকেশন করুন।
                </div>

                {adminLoginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                    {adminLoginError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">অ্যাডমিন জিমেইল ID *</label>
                  <input
                    type="email"
                    placeholder="যেমনঃ bdagentpay@gmail.com"
                    value={adminEmail}
                    onChange={(e) => { setAdminLoginError(''); setAdminEmail(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">অ্যাডমিন পাসওয়ার্ড *</label>
                  <input
                    type="password"
                    placeholder="১০ সংখ্যার গোপন পিন দিন"
                    value={adminPassword}
                    onChange={(e) => { setAdminLoginError(''); setAdminPassword(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition mt-2 shadow-xs cursor-pointer active:scale-98"
                >
                  সুরক্ষিত অ্যাডমিন লগইন
                </button>
              </form>
            ) : (
              /* ADMIN LOGGED IN: VIEW SPECIFIC BALANCE DEPOSIT DETAILS */
              <div className="flex flex-col gap-4">
                {(() => {
                  const req = balanceRequests.find(r => r.id === adminRequestId) || {
                    id: adminRequestId,
                    amount: 50000,
                    method: 'bKash' as const,
                    senderNumber: '01812762441',
                    txid: 'TX89182390A',
                    status: 'pending' as const,
                    timestamp: Date.now() - 60000 * 5,
                    agentId: agent.id || 'default_agent'
                  };

                  const isRequestPending = req.status === 'pending';

                  return (
                    <>
                      <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2.5 text-xs font-sans">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-150">
                          <span className="font-bold text-slate-500">অনুরোধ আইডি (Request ID)</span>
                          <span className="font-mono font-bold text-slate-800 bg-slate-150 px-2 py-0.5 rounded-md">{req.id}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">অনুরোধকারী এজেন্ট আইডি</span>
                          <span className="font-mono font-bold text-slate-850">{req.agentId}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-500 font-bold">অনুরোধের পরিমাণ (Amount)</span>
                          <span className="text-emerald-700 text-base font-bold font-sans">৳{req.amount.toLocaleString('bn-BD')}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">পেমেন্ট মেথড (Payment)</span>
                          <span className="font-bold text-slate-850 uppercase">{req.method}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">এজেন্টের মোবাইল নম্বর (Sender)</span>
                          <span className="font-mono font-semibold text-slate-800">{req.senderNumber}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">ট্রানজেকশন আইডি (TxID)</span>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-sm">{req.txid}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">অনুরোধের সময়</span>
                          <span className="font-sans font-medium text-slate-700">
                            {new Date(req.timestamp).toLocaleString('bn-BD')}
                          </span>
                        </div>

                        {req.screenshotUrl && (
                          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-150/60 text-left">
                            <span className="text-slate-500 font-bold block">পেমেন্ট স্ক্রিনশট প্রমাণঃ</span>
                            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 p-1 flex items-center justify-center max-h-48">
                              <img src={req.screenshotUrl} alt="Transaction screenshot proof" className="max-h-44 w-auto rounded-lg object-contain shadow-xs" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-150/60">
                          <span className="text-slate-500">স্ট্যাটাস</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            req.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : req.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-orange-200 animate-pulse'
                          }`}>
                            {req.status === 'approved' ? 'অনুমোদিত (Approved)' : req.status === 'rejected' ? 'বাতিলকৃত (Cancelled)' : 'বকেয়া (Pending)'}
                          </span>
                        </div>
                      </div>

                      {/* CTA Actions */}
                      {isRequestPending ? (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id)}
                            className="py-2.5 font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-250 transition cursor-pointer outline-none"
                          >
                            অনুরোধ বাতিল করুন
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.id)}
                            className="py-2.5 font-bold text-xs text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl border border-emerald-250 transition cursor-pointer shadow-xs outline-none"
                          >
                            অনুরোধ এপ্রুভ করুন
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-center text-xs font-bold leading-relaxed shadow-3xs">
                          🎉 অনুরোধটি সফলভাবে নিষ্পত্তি করা হয়েছে! এজেন্টের মেইন ব্যালেন্সে টাকা জমা হয়ে গেছে।
                        </div>
                      )}
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState({}, '', window.location.pathname);
                    setAdminRequestId(null);
                  }}
                  className="w-full mt-2 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50/50 transition cursor-pointer text-center outline-none"
                >
                  ← পোর্টাল ড্যাশবোর্ডে ফিরে যান (Return to Dashboard)
                </button>
              </div>
            )}
          </motion.div>
        ) : !isLogged ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white border border-slate-200 p-6.5 rounded-3xl mt-5 shadow-xl relative overflow-hidden flex flex-col gap-5"
          >
            {/* Branding */}
            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-2 shadow-2xs">
                <Smartphone className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold font-display text-slate-800 tracking-tight">Agent Pay</h2>
              <p className="text-xs text-slate-500 mt-0.5">মোবাইল এজেন্ট ট্রানজেকশন পোর্টাল</p>
            </div>

            {/* Switcher Tab */}
            <div className="grid grid-cols-2 bg-slate-100/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setLoginError(''); setAuthTab('login'); }}
                className={`py-2 text-center text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-white text-blue-750 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                লগইন করুন (Sign In)
              </button>
              <button
                type="button"
                onClick={() => { setLoginError(''); setAuthTab('register'); }}
                className={`py-2 text-center text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-white text-blue-750 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                রেজিস্ট্রেশন (Onboard)
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                {loginError}
              </div>
            )}

            {authTab === 'login' ? (
              /* 1. LOGIN FORM */
              <form onSubmit={handleLogin} className="flex flex-col gap-3 font-sans">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">জিমেইল বা মোবাইল নম্বর *</label>
                  <input
                    type="text"
                    placeholder="যেমনঃ alternative@gmail.com বা 017..."
                    value={loginUser}
                    onChange={(e) => { setLoginError(''); setLoginUser(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition font-medium"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">পাসওয়ার্ড *</label>
                  <input
                    type="password"
                    placeholder="আপনার গোপন পাসওয়ার্ড দিন"
                    value={loginPassword}
                    onChange={(e) => { setLoginError(''); setLoginPassword(e.target.value); }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="login_action_btn"
                  className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white transition mt-2 shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  ওয়ালেটে প্রবেশ করুন
                </button>
              </form>
            ) : (
              /* 2. REGISTRATION FORM */
              <form onSubmit={handleRegisterAgent} className="flex flex-col gap-3 font-sans">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">এজেন্ট নাম *</label>
                    <input
                      type="text"
                      placeholder="রনি টেলিকম"
                      value={agentNameInput}
                      onChange={(e) => { setLoginError(''); setAgentNameInput(e.target.value); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition text-ellipsis"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">জন্ম তারিখ *</label>
                    <input
                      type="date"
                      value={agentDobInput}
                      onChange={(e) => { setLoginError(''); setAgentDobInput(e.target.value); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">জিমেইল *</label>
                    <input
                      type="email"
                      placeholder="rony@gmail.com"
                      value={agentEmailInput}
                      onChange={(e) => { setLoginError(''); setAgentEmailInput(e.target.value); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-55 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition text-ellipsis"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">মোবাইল নাম্বার *</label>
                    <input
                      type="text"
                      placeholder="01712345678"
                      value={agentPhoneInput}
                      onChange={(e) => { setLoginError(''); setAgentPhoneInput(e.target.value); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-55 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition text-ellipsis"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">রেফার কোড (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      placeholder="যেমনঃ AGPAY11"
                      value={agentReferralInput}
                      onChange={(e) => setAgentReferralInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition text-ellipsis"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">পাসওয়ার্ড *</label>
                    <input
                      type="password"
                      placeholder="গোপন পিন/পাসওয়ার্ড"
                      value={agentPasswordInput}
                      onChange={(e) => { setLoginError(''); setAgentPasswordInput(e.target.value); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-850 outline-none focus:border-blue-500 transition text-ellipsis"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="create_profile_btn"
                  className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white transition mt-2 shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  এজেন্ট অ্যাকাউন্ট তৈরি করুন
                </button>
              </form>
            )}

            {/* Splitter */}
            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">অথবা</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            {/* Selection profile buttons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">রানিং টেস্ট একাউন্ট সিলেক্ট করুনঃ</span>
              <button
                type="button"
                id="default_agent_btn"
                onClick={() => handleProfileSelect('default_agent')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/30 border border-slate-200/80 hover:border-blue-500/30 text-left flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-650">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">জনি এন্টারপ্রাইজ (ডিফল্ট)</span>
                    <span className="text-[9.5px] text-slate-505 font-sans">ID: DEFAULT_AGENT • ব্যালেন্স ৳১.৪৫ লক্ষ</span>
                  </div>
                </div>
                <div className="p-1.5 px-3.5 rounded-lg bg-blue-600 text-white shadow-2xs hover:bg-blue-750 transition text-[10.5px] font-bold font-sans">
                  কানেক্ট
                </div>
              </button>
            </div>

            <div className="text-center text-[9px] text-slate-400 font-medium">
              সিস্টেম ক্লাউড ফায়ারবেস রিয়েল-টাইম ডাটাবেস দ্বারা সুরক্ষিত।
            </div>
          </motion.div>
        ) : (
          
          /* AGNET DASHBOARD VIEW */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col items-center shadow-md">
              
              {/* Header components */}
              <Header 
                agent={agent}
                unreadCount={unreadCount}
                onOpenNotifications={() => setIsNotificationPanelOpen(true)}
                isFirebaseSynced={isFirebaseSynced}
                onRefreshData={handleRefreshData}
                onOpenProfile={() => setActiveModal('profile')}
                onLogout={handleLogout}
              />

              {/* Quick Shortcuts Menu */}
              <QuickMenu onSelectAction={(key) => setActiveModal(key)} />

              {/* Simple Footer metadata */}
              <div className="w-full text-center py-4.5 bg-slate-50 border-t border-slate-150 text-[10px] text-slate-400 mt-4 flex justify-between items-center px-4.5 font-sans">
                <span className="font-semibold text-slate-500">© 2026 Agent Pay</span>
                <span className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isFirebaseSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  <span className="font-bold tracking-wider text-[9.5px] text-slate-500">STATUS: LIVE</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY SYSTEM (NOTIFICATIONS PANEL & MODALS) */}
      <AnimatePresence>
        {isNotificationPanelOpen && (
          <NotificationCenter 
            notifications={notifications}
            onClose={() => setIsNotificationPanelOpen(false)}
            onMarkAllRead={handleMarkAllRead}
            onClearAll={handleClearAllNotifs}
            onMarkRead={handleMarkRead}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal && (
          <Modals 
            type={activeModal}
            onClose={() => setActiveModal(null)}
            agent={agent}
            transactions={transactions}
            balanceRequests={balanceRequests}
            commissionWithdrawals={commissionWithdrawals}
            onSubmitDeposit={handleDepositSubmit}
            onSubmitWithdraw={handleWithdrawSubmit}
            onSubmitBalanceRequest={handleBalanceRequestSubmit}
            onSubmitCommissionWithdrawal={handleCommissionWithdrawal}
            playerRequests={playerRequests}
            onResolvePlayerRequest={handleResolvePlayerRequest}
            timeLeft={timeLeft}
            onTriggerPlayerRequest={triggerNewRandomPlayerRequest}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
