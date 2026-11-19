/**
 * FoodWise AI - Comprehensive Test Suite for Web Audio Sound Effects System
 *
 * Verifies:
 * 1. Default sound preferences (Strictly OFF by default, volume 0.5)
 * 2. LocalStorage persistence and resilience against corrupted JSON / missing storage
 * 3. Volume boundary clamping (0.0 to 1.0, invalid input normalization)
 * 4. Web Audio API node synthesis for all 10 sound types:
 *    - click, favorite_add, favorite_remove, deal_saved, modal_open, modal_close,
 *      search_initiate, comparison_complete, action_success, action_error
 * 5. Rate limiting and anti-cacophony cooldown enforcement
 * 6. Browser autoplay state compliance (handles 'suspended' and lazy resumption)
 * 7. Zero audio node allocations when muted or disabled
 * 8. Graceful fallbacks when Web Audio API is unsupported
 */

import assert from 'assert';
import {
  soundEngine,
  loadSoundPreferences,
  saveSoundPreferences,
  DEFAULT_SOUND_PREFERENCES,
  SOUND_STORAGE_KEY,
  SoundEffectType,
} from './src/utils/soundEffects';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

// In-memory mock localStorage implementation
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Mock Web Audio API primitives
class MockAudioParam {
  value: number = 0;
  scheduledEvents: Array<{ type: string; value: number; time: number }> = [];

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.scheduledEvents.push({ type: 'setValueAtTime', value, time });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.scheduledEvents.push({ type: 'linearRampToValueAtTime', value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.scheduledEvents.push({ type: 'exponentialRampToValueAtTime', value, time });
  }
}

class MockAudioNode {
  connectedTo: any = null;
  connect(dest: any) {
    this.connectedTo = dest;
    return dest;
  }
  disconnect() {
    this.connectedTo = null;
  }
}

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency: MockAudioParam = new MockAudioParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  start(time = 0) {
    this.startedAt = time;
  }
  stop(time = 0) {
    this.stoppedAt = time;
  }
}

class MockGainNode extends MockAudioNode {
  gain: MockAudioParam = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency: MockAudioParam = new MockAudioParam();
  Q: MockAudioParam = new MockAudioParam();
}

class MockAudioContext {
  state: AudioContextState = 'suspended';
  currentTime: number = 0.5;
  destination: MockAudioNode = new MockAudioNode();
  resumedCount: number = 0;
  createdOscillators: MockOscillatorNode[] = [];
  createdGains: MockGainNode[] = [];
  createdFilters: MockBiquadFilterNode[] = [];

  createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  }

  createGain(): MockGainNode {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const filter = new MockBiquadFilterNode();
    this.createdFilters.push(filter);
    return filter;
  }

  async resume(): Promise<void> {
    this.state = 'running';
    this.resumedCount++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('  FoodWise AI: Web Audio Sound Effects System Verification     ');
  console.log('================================================================\n');

  // Set up mock window and localStorage
  const mockStorage = new MockLocalStorage();
  const mockAudioContextInstance = new MockAudioContext();

  (global as any).window = {
    AudioContext: function () {
      return mockAudioContextInstance;
    },
    localStorage: mockStorage,
  };
  (global as any).localStorage = mockStorage;

  // -------------------------------------------------------------
  // Suite 1: Sound Preferences & Default Opt-In Safety
  // -------------------------------------------------------------
  console.log('--- Suite 1: Sound Preferences & Default Configuration ---');

  await runTest('Suite 1', 'Default sound setting is strictly OFF (Opt-in requirement)', () => {
    mockStorage.clear();
    const prefs = loadSoundPreferences();
    assert.strictEqual(
      prefs.soundEnabled,
      false,
      'Sound MUST be disabled by default so users are never surprised by unexpected audio'
    );
    assert.strictEqual(
      prefs.volume,
      0.5,
      'Default volume must be set to a balanced mid-point (0.5)'
    );
  });

  await runTest('Suite 1', 'Preferences round-trip persist accurately in localStorage', () => {
    mockStorage.clear();
    saveSoundPreferences({ soundEnabled: true, volume: 0.75 });
    const saved = loadSoundPreferences();
    assert.strictEqual(saved.soundEnabled, true);
    assert.strictEqual(saved.volume, 0.75);
  });

  await runTest('Suite 1', 'Volume is clamped between 0.0 and 1.0 on save and load', () => {
    mockStorage.clear();
    // Test negative volume
    saveSoundPreferences({ soundEnabled: true, volume: -0.5 });
    let saved = loadSoundPreferences();
    assert.strictEqual(saved.volume, 0.0, 'Negative volume must clamp to 0.0');

    // Test excessive volume
    saveSoundPreferences({ soundEnabled: true, volume: 2.5 });
    saved = loadSoundPreferences();
    assert.strictEqual(saved.volume, 1.0, 'Volume > 1.0 must clamp to 1.0');
  });

  await runTest('Suite 1', 'Corrupted or malformed localStorage json recovers safely to defaults', () => {
    mockStorage.setItem(SOUND_STORAGE_KEY, '{invalid_json:::');
    const prefs = loadSoundPreferences();
    assert.strictEqual(prefs.soundEnabled, false);
    assert.strictEqual(prefs.volume, 0.5);
  });

  // -------------------------------------------------------------
  // Suite 2: Autoplay & Context Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Autoplay & Context Lifecycle ---');

  await runTest('Suite 2', 'Suspended context is safely resumed on gesture access', async () => {
    mockAudioContextInstance.state = 'suspended';
    mockAudioContextInstance.resumedCount = 0;

    const ctx = soundEngine.getOrCreateContext();
    assert(ctx !== null, 'Audio context must be returned');
    assert.strictEqual(mockAudioContextInstance.resumedCount, 1, 'Context must call resume() if suspended');
  });

  await runTest('Suite 2', 'Gracefully returns null when AudioContext is unsupported', () => {
    const originalAudioContext = (global as any).window.AudioContext;
    delete (global as any).window.AudioContext;

    // Direct instantiation with no audio API available
    const tempEngine = new (soundEngine.constructor as any)();
    const ctx = tempEngine.getOrCreateContext();
    assert.strictEqual(ctx, null, 'Should return null when AudioContext does not exist');

    (global as any).window.AudioContext = originalAudioContext;
  });

  // -------------------------------------------------------------
  // Suite 3: Audio Synthesis Profiles (All 10 Sound Types)
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Audio Synthesis Profiles (Web Audio API) ---');

  const soundTypes: SoundEffectType[] = [
    'click',
    'favorite_add',
    'favorite_remove',
    'deal_saved',
    'modal_open',
    'modal_close',
    'search_initiate',
    'comparison_complete',
    'action_success',
    'action_error',
  ];

  for (const soundType of soundTypes) {
    await runTest('Suite 3', `Synthesizes "${soundType}" using polite acoustic profile`, async () => {
      // Clear tracking lists
      mockAudioContextInstance.createdOscillators = [];
      mockAudioContextInstance.createdGains = [];
      mockAudioContextInstance.createdFilters = [];

      // Advance clock slightly to bypass throttle from earlier calls
      await new Promise((r) => setTimeout(r, 70));

      soundEngine.play(soundType, 0.6);

      assert(
        mockAudioContextInstance.createdOscillators.length >= 1,
        `Expected "${soundType}" to allocate at least 1 oscillator`
      );
      assert(
        mockAudioContextInstance.createdGains.length >= 1,
        `Expected "${soundType}" to allocate at least 1 gain node`
      );

      // Verify that all oscillators were started and scheduled to stop cleanly
      for (const osc of mockAudioContextInstance.createdOscillators) {
        assert(osc.startedAt !== null, `Oscillator for "${soundType}" must be started`);
        assert(osc.stoppedAt !== null, `Oscillator for "${soundType}" must be scheduled to stop`);
        assert(osc.stoppedAt > osc.startedAt, 'Stop time must be after start time');
      }
    });
  }

  // -------------------------------------------------------------
  // Suite 4: Rate Limiting & Zero Overhead When Muted
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Rate Limiting & Zero Resource Allocation ---');

  await runTest('Suite 4', 'Zero audio nodes created when volume is 0 or muted', () => {
    mockAudioContextInstance.createdOscillators = [];
    mockAudioContextInstance.createdGains = [];

    soundEngine.play('click', 0);
    soundEngine.play('action_success', -0.5);

    assert.strictEqual(
      mockAudioContextInstance.createdOscillators.length,
      0,
      'Must allocate zero oscillator nodes when muted'
    );
    assert.strictEqual(
      mockAudioContextInstance.createdGains.length,
      0,
      'Must allocate zero gain nodes when muted'
    );
  });

  await runTest('Suite 4', 'Rate limiting throttles rapid successive click events', async () => {
    mockAudioContextInstance.createdOscillators = [];

    // Advance clock past any previous cooldowns
    await new Promise((r) => setTimeout(r, 60));

    // Play first click - should succeed
    soundEngine.play('click', 0.5);
    const countAfterFirst = mockAudioContextInstance.createdOscillators.length;
    assert.strictEqual(countAfterFirst, 1, 'First click must play');

    // Rapid second click immediately after (0ms) - should be throttled
    soundEngine.play('click', 0.5);
    assert.strictEqual(
      mockAudioContextInstance.createdOscillators.length,
      1,
      'Rapid second click must be rate-limited and dropped to prevent clipping'
    );

    // Wait 60ms past cooldown and try again - should succeed
    await new Promise((r) => setTimeout(r, 65));
    soundEngine.play('click', 0.5);
    assert.strictEqual(
      mockAudioContextInstance.createdOscillators.length,
      2,
      'Click after cooldown expiration must succeed'
    );
  });

  // -------------------------------------------------------------
  // Suite 5: Acoustic Quality Verifications (SaaS Polish)
  // -------------------------------------------------------------
  console.log('\n--- Suite 5: Acoustic Quality & Parameter Checks ---');

  await runTest('Suite 5', 'Click sound uses triangle waveform and lowpass filter for warmth', async () => {
    await new Promise((r) => setTimeout(r, 60));
    mockAudioContextInstance.createdOscillators = [];
    mockAudioContextInstance.createdFilters = [];

    soundEngine.play('click', 0.5);
    const osc = mockAudioContextInstance.createdOscillators[0];
    const filter = mockAudioContextInstance.createdFilters[0];

    assert.strictEqual(osc.type, 'triangle', 'Click must use soft triangle wave rather than harsh square/sawtooth');
    assert.strictEqual(filter.type, 'lowpass', 'Click must use lowpass filter to eliminate high-frequency spikes');
  });

  await runTest('Suite 5', 'Action error uses gentle dual low-frequency warning without harsh screeching', async () => {
    await new Promise((r) => setTimeout(r, 70));
    mockAudioContextInstance.createdOscillators = [];

    soundEngine.play('action_error', 0.5);

    assert.strictEqual(
      mockAudioContextInstance.createdOscillators.length,
      2,
      'Error sound must consist of 2 polite low-frequency taps'
    );

    // Verify low frequency (< 300 Hz) to avoid arcade buzzer style
    const initialFreq = mockAudioContextInstance.createdOscillators[0].frequency.scheduledEvents.find(
      (e) => e.type === 'setValueAtTime'
    )?.value;
    assert(
      initialFreq !== undefined && initialFreq <= 250,
      `Error tone frequency (${initialFreq} Hz) must be subtle and low (< 250 Hz)`
    );
  });

  await runTest('Suite 5', 'Deal saved plays elegant 3-note ascending arpeggio', async () => {
    await new Promise((r) => setTimeout(r, 70));
    mockAudioContextInstance.createdOscillators = [];

    soundEngine.play('deal_saved', 0.5);

    assert.strictEqual(
      mockAudioContextInstance.createdOscillators.length,
      3,
      'Deal saved must play a 3-note harmonious chord arpeggio'
    );
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  SOUND EFFECTS SYSTEM TEST RESULTS SUMMARY                     ');
  console.log('================================================================');
  console.log(`  Total Tests Executed: ${totalTests}`);
  console.log(`  Tests Passed:         ${passedTests}`);
  console.log(`  Tests Failed:         ${failedTests}`);

  if (failedTests > 0) {
    console.error(`\n  ❌ ${failedTests} TEST(S) FAILED!`);
    process.exit(1);
  } else {
    console.log('\n  🎉 ALL SOUND EFFECTS TESTS PASSED WITH 100% SUCCESS!');
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
