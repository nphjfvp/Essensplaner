import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { normalizeCode, codeToEmail } from '../lib/code';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  createAccountWithCode: (rawCode: string) => Promise<void>;
  signInWithCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const createAccountWithCode = async (rawCode: string) => {
    await createUserWithEmailAndPassword(auth, codeToEmail(rawCode), rawCode);
  };

  const signInWithCode = async (code: string) => {
    const raw = normalizeCode(code);
    await signInWithEmailAndPassword(auth, codeToEmail(raw), raw);
  };

  const signOut = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInGoogle, createAccountWithCode, signInWithCode, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
