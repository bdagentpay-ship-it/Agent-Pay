/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  playerId: string;
  playerName: string;
  amount: number;
  comPercent: number;
  comAmount: number;
  method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay';
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  agentId?: string;
  siteName?: string;
  senderNumber?: string;
  txid?: string;
}

export interface BalanceRequest {
  id: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Rocket' | 'Bank';
  senderNumber: string;
  txid: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  agentId?: string;
  screenshotUrl?: string;
}

export interface CommissionWithdrawal {
  id: string;
  amount: number;
  method: 'main_balance' | 'mobile_banking';
  mobileBankingMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay';
  receiverNumber?: string;
  timestamp: number;
  status: 'completed' | 'pending';
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type: 'deposit' | 'withdraw' | 'balance' | 'commission' | 'general';
}

export interface AgentLimits {
  dailyDeposit: number;
  weeklyDeposit: number;
  monthlyDeposit: number;
  dailyWithdraw: number;
  weeklyWithdraw: number;
  monthlyWithdraw: number;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  password?: string;
  balance: number;
  commissionBalance: number;
  todayDeposit: number;
  todayWithdraw: number;
  referralsCount: number;
  referralEarnings: number;
  referralCode: string;
  limits?: AgentLimits;
}

export interface PlayerRequest {
  id: string;
  type: 'deposit' | 'withdraw';
  siteName: string;
  playerId: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Upay';
  senderNumber: string; // 11 digits
  txid?: string; // only for deposit
  amount: number; // 300, 500, 1000, 1500, 5000
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

