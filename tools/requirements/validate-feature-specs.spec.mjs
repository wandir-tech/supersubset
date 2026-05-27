import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runValidation } from './validate-feature-specs.mjs';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, '../..');
const FIXTURES_ROOT = join(TOOL_DIR, 'fixtures');

/** @param {string} name */
function fixtureRoot(name) {
  return join(FIXTURES_ROOT, name);
}

/** @param {{ errors: string[] }} result */
function errorText(result) {
  return result.errors.join('\n');
}

test('repo requirements layer passes validation', () => {
  const result = runValidation({ root: REPO_ROOT, scanTests: true });
  assert.equal(result.errors.length, 0, `expected no validation errors:\n${errorText(result)}`);
});

test('repo term files do not use ui.native_app keys', () => {
  const result = runValidation({ root: REPO_ROOT, scanTests: false });
  const uiKeyErrors = result.errors.filter((error) =>
    error.includes('term.references.ui has unsupported keys native_app'),
  );
  assert.deepEqual(uiKeyErrors, []);
});

test('valid minimal fixture passes', () => {
  const result = runValidation({ root: fixtureRoot('valid-minimal'), scanTests: false });
  assert.equal(result.errors.length, 0, errorText(result));
  assert.ok('valid-minimal.DEMO.1' in result.specIds);
});

test('empty feature file fails validation', () => {
  const result = runValidation({ root: fixtureRoot('empty-feature'), scanTests: false });
  assert.ok(result.errors.some((error) => error.includes('file is empty')));
});

test('term ui.native_app key fails validation', () => {
  const result = runValidation({ root: fixtureRoot('bad-ui-key'), scanTests: false });
  assert.ok(
    result.errors.some((error) =>
      error.includes('term.references.ui has unsupported keys native_app'),
    ),
  );
});

test('extra feature top-level keys fail validation', () => {
  const result = runValidation({ root: fixtureRoot('extra-top-level'), scanTests: false });
  assert.ok(result.errors.some((error) => error.includes('unsupported top-level keys terms')));
});

test('non-numeric requirement keys fail validation', () => {
  const result = runValidation({ root: fixtureRoot('bad-req-key'), scanTests: false });
  assert.ok(result.errors.some((error) => error.includes('must use numeric keys like 1 or 1-1')));
});

test('quoted hyphenated requirement keys pass validation', () => {
  const result = runValidation({ root: fixtureRoot('hyphen-key'), scanTests: false });
  assert.equal(result.errors.length, 0, errorText(result));
  assert.ok('hyphen-key.DEMO.1-1' in result.specIds);
});

test('orphan test ACIDs fail validation', () => {
  const result = runValidation({ root: fixtureRoot('orphan-acid'), scanTests: true });
  assert.ok(
    result.errors.some((error) =>
      error.includes('test reference orphan-acid.DEMO.99 has no matching feature requirement'),
    ),
  );
});
