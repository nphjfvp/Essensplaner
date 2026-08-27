const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 Zeichen, ohne I/O/0/1

// 20 Zeichen aus 32er-Alphabet = 100 Bit Entropie.
export function generateCode(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function formatCode(raw: string): string {
  return raw.toUpperCase().replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

export function codeToEmail(raw: string): string {
  return `u_${raw.toLowerCase()}@essensplaner.app`;
}
