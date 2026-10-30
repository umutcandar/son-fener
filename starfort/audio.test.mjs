import test from 'node:test';
import assert from 'node:assert/strict';
import { synthSamples } from './audio.js';

const energy = samples => samples.reduce((sum, value) => sum + Math.abs(value), 0);

test('procedural cues stay inside the sample and the town drone is not the battle pulse', () => {
  for (const kind of ['tap', 'upgrade', 'collect', 'town', 'battle-1', 'battle-2', 'battle-3']) {
    const samples = synthSamples(kind, 1600);
    assert.equal(samples.length, 1600);
    assert.ok([...samples].every(value => Number.isFinite(value) && Math.abs(value) <= 1));
    assert.ok(energy(samples) > 1);
  }
  assert.notEqual(Math.round(energy(synthSamples('town', 2000))), Math.round(energy(synthSamples('battle-1', 2000))));
  assert.notEqual(Math.round(energy(synthSamples('battle-2', 2000))), Math.round(energy(synthSamples('battle-3', 2000))));
});
