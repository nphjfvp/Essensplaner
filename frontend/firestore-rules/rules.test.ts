import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'demo-essensplaner-rules-test';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('recipes', () => {
  it('lets an owner create their own recipe', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(alice.collection('recipes').add({ ownerId: 'alice', title: 'Test' }));
  });

  it('rejects creating a recipe with a different ownerId', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(alice.collection('recipes').add({ ownerId: 'bob', title: 'Test' }));
  });

  it('rejects unauthenticated creates', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(anon.collection('recipes').add({ ownerId: 'alice', title: 'Test' }));
  });

  it('lets an owner read their own recipe but not someone else\'s', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Alice Recipe' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(alice.doc('recipes/r1').get());
    await assertFails(bob.doc('recipes/r1').get());
  });

  it('lets an owner update their own recipe', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Old Title' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(alice.doc('recipes/r1').update({ title: 'New Title' }));
  });

  // Regressionstest für den in dieser Session gefixten Bug: ownerId ließ
  // sich bei einem Update auf eine fremde UID umschreiben.
  it('rejects changing ownerId on update, even by the current owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Mine' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(alice.doc('recipes/r1').update({ ownerId: 'bob' }));
  });

  it("rejects updating someone else's recipe", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Mine' });
    });
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(bob.doc('recipes/r1').update({ title: 'Hijacked' }));
  });

  it('lets an owner delete their own recipe', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Mine' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(alice.doc('recipes/r1').delete());
  });

  it("rejects deleting someone else's recipe", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('recipes/r1').set({ ownerId: 'alice', title: 'Mine' });
    });
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(bob.doc('recipes/r1').delete());
  });
});

describe('users/{uid}', () => {
  it('lets a user read/write their own user doc', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(alice.doc('users/alice').set({ settings: {} }, { merge: true }));
    await assertSucceeds(alice.doc('users/alice').get());
  });

  it("rejects writing another user's user doc", async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(alice.doc('users/bob').set({ settings: {} }, { merge: true }));
  });
});

describe('pantry (gleiche owner-scoped Regeln wie mealplan/shopping/folders/mealplanTemplates)', () => {
  it('rejects changing ownerId on update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('pantry/p1').set({ ownerId: 'alice', name: 'Mehl' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(alice.doc('pantry/p1').update({ ownerId: 'bob' }));
  });

  it("rejects reading someone else's pantry item", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('pantry/p1').set({ ownerId: 'alice', name: 'Mehl' });
    });
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(bob.doc('pantry/p1').get());
  });
});
