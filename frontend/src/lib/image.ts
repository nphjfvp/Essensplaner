// Client-seitige Bildverkleinerung vor dem Versand an ein Vision-Modell bzw.
// Firebase Storage — hält Requests klein und schnell.
export function resizeImageToDataUrl(file: File, maxWidth = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Bild nicht lesbar'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Bild nicht lesbar'));
    reader.readAsDataURL(file);
  });
}
