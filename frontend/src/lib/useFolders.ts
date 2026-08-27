import { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_FOLDERS } from './folders';

// Lädt eigene Ordner aus Firestore + DEFAULT_FOLDERS. create() legt neue an.
export function useFolders(uid: string | undefined) {
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'folders'), where('ownerId', '==', uid));
    return onSnapshot(q, (snap) => {
      setCustom(snap.docs.map((d) => d.data().name as string));
    });
  }, [uid]);

  const create = async (name: string) => {
    if (!uid) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await addDoc(collection(db, 'folders'), { ownerId: uid, name: trimmed, is_default: false });
  };

  const all = Array.from(new Set([...DEFAULT_FOLDERS, ...custom]));

  return { all, create };
}
