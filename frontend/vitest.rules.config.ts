import { defineConfig } from 'vitest/config';

// Separat vom normalen `npm run test`, weil diese Tests einen laufenden
// Firestore-Emulator brauchen (siehe firestore-rules/README bzw.
// package.json-Skript "test:rules").
export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
