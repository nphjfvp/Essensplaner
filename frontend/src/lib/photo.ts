import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

function resizeToBlob(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht verarbeitet werden'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Bild nicht lesbar'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Bild nicht lesbar'));
    reader.readAsDataURL(file);
  });
}

function photoPath(uid: string, recipeId: string): string {
  return `users/${uid}/recipes/${recipeId}/photo.jpg`;
}

// Nachgekocht-Foto: separat vom (KI-freien) Import, wird erst nach dem Kochen hochgeladen.
// Überschreibt immer denselben Storage-Pfad, damit kein altes Foto verwaist.
export async function uploadRecipePhoto(uid: string, recipeId: string, file: File): Promise<string> {
  const blob = await resizeToBlob(file);
  const storageRef = ref(storage, photoPath(uid, recipeId));
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

export async function deleteRecipePhoto(uid: string, recipeId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, photoPath(uid, recipeId)));
  } catch {
    // Objekt existiert evtl. nicht (mehr) — ignorieren
  }
}
