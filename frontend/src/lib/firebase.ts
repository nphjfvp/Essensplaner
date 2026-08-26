import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAfTqVjfhiMvDJW2DaS5EpkZy_zOEva340',
  authDomain: 'essensplaner-38899.firebaseapp.com',
  projectId: 'essensplaner-38899',
  storageBucket: 'essensplaner-38899.firebasestorage.app',
  messagingSenderId: '843157831036',
  appId: '1:843157831036:web:0630c653546af6366178f9',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
