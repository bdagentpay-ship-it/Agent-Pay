/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-b9675",
  appId: "1:460163809180:web:30bfa87fe91afa2dc19259",
  apiKey: "AIzaSyD9IyVysQbAKTyujSZqlvS_qze39hB14eA",
  authDomain: "ai-studio-applet-webapp-b9675.firebaseapp.com",
  storageBucket: "ai-studio-applet-webapp-b9675.firebasestorage.app",
  messagingSenderId: "460163809180"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use custom firestore database ID from configuration
const db = getFirestore(app, "ai-studio-e7ee2561-3fe9-45e6-94e6-4f5491c1ac2c");

export { app, db };
