import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCw9Sy6vFrL1JTY9-HWQrTJsTZMhUM2Aig",
  authDomain: "opslyft-dialer.firebaseapp.com",
  databaseURL: "https://opslyft-dialer-default-rtdb.firebaseio.com",
  projectId: "opslyft-dialer",
  storageBucket: "opslyft-dialer.firebasestorage.app",
  messagingSenderId: "571952219763",
  appId: "1:571952219763:web:a4fd769daa1aa40f29cc06"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
