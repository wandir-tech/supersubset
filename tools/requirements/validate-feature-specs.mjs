#!/usr/bin/env node

/**
 * Feature spec and Acai ID test-prefix validator.
 *
 * Usage:
 *   node tools/requirements/validate-feature-specs.mjs [--coverage] [--json] [--root <path>]
 *
 * npm run validate:requirements
 * npm run requirements:coverage
 * npm run --silent requirements:coverage:json
 * npm run test:requirements-validator
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const DEFAULT_ROOT = resolve(import.meta.dirname, '../..');
const ACID = /\[([a-z0-9-]+\.[A-Z0-9_]+\.\d+(?:-\d+)*)\]/g;
const EMPHASIZED_TERM = /\*([^*]+)\*/g;
const GROUP_KEY = /^[A-Z][A-Z0-9_]*$/;
const REQUIREMENT_KEY = /^\d+(?:-\d+)*$/;
const TERM_ID = /^[a-z][a-z0-9_]*$/;
const FEATURE_TOP_LEVEL_KEYS = new Set(['feature', 'components', 'constraints']);
const EXPECTED_PRODUCT = 'supersubset';
const TEST_SCAN_SKIP_DIRS = new Set([
  '.git',
  '.nx',
  '.next',
  '.cache',
  '.expo',
  'node_modules',
  'dist',
  'coverage',
  'fixtures',
]);
const KNOWN_CLI_FLAGS = new Set(['--coverage', '--json', '--root', '--help']);

/** @type {string} */
let ROOT = DEFAULT_ROOT;
const errors = [];
const warnings = [];

/** @type {string[]} */
let featureFiles = [];
/** @type {string[]} */
let termFiles = [];
/** @type {string[]} */
let referenceFiles = [];
/** @type {string} */
let platformFile = '';
/** @type {string[]} */
let testScanRoots = [DEFAULT_ROOT];

/** @type {Set<string>} */
let termIds = new Set();
/** @type {Map<string, string>} */
const termPhraseIndex = new Map();

/** @type {Record<string, string>} */
const specIds = {};
/** @type {Record<string, { path: string, feature: string, text: string }>} */
const specIdMeta = {};

/**
 * @param {string[]} argv
 */
function parseCliArgs(argv) {
  /** @type {{ root: string, coverageMode: boolean, jsonOutput: boolean, help: boolean, unknownArgs: string[] }} */
  const parsed = {
    root: DEFAULT_ROOT,
    coverageMode: false,
    jsonOutput: false,
    help: false,
    unknownArgs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--coverage') {
      parsed.coverageMode = true;
      continue;
    }
    if (arg === '--json') {
      parsed.jsonOutput = true;
      continue;
    }
    if (arg === '--root') {
      const value = argv[index + 1];
      if (!value) {
        parsed.unknownArgs.push('--root (missing value)');
        break;
      }
      parsed.root = resolve(value);
      index += 1;
      continue;
    }
    if (KNOWN_CLI_FLAGS.has(arg) || arg.startsWith('--root=')) {
      parsed.unknownArgs.push(arg);
      continue;
    }
    if (arg.startsWith('-')) {
      parsed.unknownArgs.push(arg);
      continue;
    }
    parsed.unknownArgs.push(arg);
  }

  if (argv.some((arg) => arg.startsWith('--root='))) {
    parsed.unknownArgs.push('--root=... (use --root <path>)');
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node tools/requirements/validate-feature-specs.mjs [--coverage] [--json] [--root <path>]

Options:
  --coverage   Print requirement test coverage by feature
  --json       Emit coverage as JSON (use with --coverage)
  --root       Validate a fixture or alternate repo root (for tests)
  --help       Show this help`);
}

function resetValidationState(root) {
  ROOT = root;
  errors.length = 0;
  warnings.length = 0;
  for (const key of Object.keys(specIds)) {
    delete specIds[key];
  }
  for (const key of Object.keys(specIdMeta)) {
    delete specIdMeta[key];
  }
  termPhraseIndex.clear();

  featureFiles = listDirectFiles(join(ROOT, 'features'), (name) =>
    name.endsWith('.feature.yaml'),
  ).sort();
  termFiles = listDirectFiles(join(ROOT, 'features', 'terms'), (name) =>
    name.endsWith('.term.yaml'),
  ).sort();
  referenceFiles = [
    join(ROOT, 'features', 'references', 'acai-feature-yaml.yaml'),
    join(ROOT, 'features', 'references', 'term-yaml.schema.yaml'),
  ];
  platformFile = join(ROOT, 'features', 'references', 'platforms.yaml');
  testScanRoots = [ROOT];
  termIds = new Set(termFiles.map((path) => basename(path, '.term.yaml')));
}

function listDirectFiles(dir, predicate) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => join(dir, entry.name));
}

function requireObject(path, label, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: ${label} must be a map`);
    return false;
  }
  return true;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function relPath(path) {
  return relative(ROOT, path);
}

function normalizeRequirementText(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function requirementText(req) {
  if (typeof req === 'string') {
    return req;
  }
  if (req && typeof req === 'object' && nonEmptyString(req.requirement)) {
    return req.requirement;
  }
  return '';
}

function registerTermPhrase(phrase, termId) {
  if (!nonEmptyString(phrase)) {
    return;
  }
  termPhraseIndex.set(phrase.trim().toLowerCase(), termId);
  termPhraseIndex.set(phrase.trim().toLowerCase().replace(/-/g, '_'), termId);
  termPhraseIndex.set(emphasizedTermToFileStem(phrase), termId);
}

function buildTermPhraseIndex() {
  for (const path of termFiles) {
    const loaded = loadYamlFile(path);
    if (loaded.loadError || !loaded.data?.term || typeof loaded.data.term !== 'object') {
      continue;
    }
    const data = loaded.data;

    const term = data.term;
    if (!nonEmptyString(term.id)) {
      continue;
    }

    registerTermPhrase(term.id, term.id);
    registerTermPhrase(term.id.replace(/_/g, ' '), term.id);

    if (Array.isArray(term.aliases)) {
      for (const alias of term.aliases) {
        registerTermPhrase(alias, term.id);
        registerTermPhrase(String(alias).replace(/_/g, ' '), term.id);
      }
    }
  }
}

function resolveEmphasizedTerm(phrase) {
  const candidates = new Set([
    phrase.trim().toLowerCase(),
    phrase.trim().toLowerCase().replace(/-/g, '_'),
    emphasizedTermToFileStem(phrase),
  ]);

  for (const candidate of candidates) {
    if (termPhraseIndex.has(candidate)) {
      return termPhraseIndex.get(candidate);
    }
    if (termIds.has(candidate)) {
      return candidate;
    }
    if (candidate.endsWith('s') && termPhraseIndex.has(candidate.slice(0, -1))) {
      return termPhraseIndex.get(candidate.slice(0, -1));
    }
    if (candidate.endsWith('_links')) {
      const linkForm = candidate.slice(0, -'_links'.length);
      if (termPhraseIndex.has(`${linkForm}_link`)) {
        return termPhraseIndex.get(`${linkForm}_link`);
      }
      if (termPhraseIndex.has(linkForm)) {
        return termPhraseIndex.get(linkForm);
      }
    }
  }

  return null;
}

function validateStringArray(path, label, value) {
  if (!Array.isArray(value)) {
    errors.push(`${path}: ${label} must be an array`);
    return;
  }

  value.forEach((item, index) => {
    if (!nonEmptyString(item)) {
      errors.push(`${path}: ${label}[${index}] must be a non-empty string`);
    }
  });
}

function validateNamedReferences(path, label, value) {
  if (!Array.isArray(value)) {
    errors.push(`${path}: ${label} must be an array`);
    return;
  }

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${path}: ${label}[${index}] must be a map`);
      return;
    }

    if (!nonEmptyString(item.name)) {
      errors.push(`${path}: ${label}[${index}].name must be a non-empty string`);
    }

    if ('schema' in item && !nonEmptyString(item.schema)) {
      errors.push(`${path}: ${label}[${index}].schema must be a non-empty string`);
    }

    const extraKeys = Object.keys(item).filter((key) => key !== 'name' && key !== 'schema');
    if (extraKeys.length > 0) {
      errors.push(`${path}: ${label}[${index}] has unsupported keys ${extraKeys.join(', ')}`);
    }
  });
}

/**
 * @returns {{ data: unknown, loadError: string | null }}
 */
function loadYamlFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    return { data: null, loadError: `failed to read file: ${error.message}` };
  }

  if (text.trim().length === 0) {
    return { data: null, loadError: 'file is empty' };
  }

  try {
    const data = parseYaml(text);
    if (data === null || data === undefined) {
      return { data: null, loadError: 'parsed to empty/null YAML document' };
    }
    return { data, loadError: null };
  } catch (error) {
    return { data: null, loadError: `failed to parse YAML: ${error.message}` };
  }
}

function reportYamlLoadError(path, { loadError }) {
  if (loadError) {
    errors.push(`${path}: ${loadError}`);
    return true;
  }
  return false;
}

function findTestFiles(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (TEST_SCAN_SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestFiles(full, results);
    } else if (entry.isFile() && /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }

  return results;
}

function emphasizedTermToFileStem(phrase) {
  return phrase.trim().toLowerCase().replace(/\s+/g, '_');
}

function validateEmphasizedTerms(path, acid, text) {
  for (const match of text.matchAll(EMPHASIZED_TERM)) {
    const phrase = match[1];
    const termId = resolveEmphasizedTerm(phrase);
    if (!termId) {
      errors.push(
        `${path}: ${acid} emphasizes *${phrase}* but no matching features/terms/<term>.term.yaml was found`,
      );
      continue;
    }
    const termPath = join(ROOT, 'features', 'terms', `${termId}.term.yaml`);
    if (!existsSync(termPath)) {
      errors.push(
        `${path}: ${acid} emphasizes *${phrase}* but features/terms/${termId}.term.yaml is missing`,
      );
    }
  }
}

function validateTerms() {
  /** @type {Record<string, string>} */
  const aliasOwners = {};

  for (const path of termFiles) {
    const loaded = loadYamlFile(path);
    if (reportYamlLoadError(path, loaded)) {
      continue;
    }

    const data = loaded.data;
    if (
      typeof data !== 'object' ||
      Array.isArray(data) ||
      Object.keys(data).length !== 1 ||
      !data.term ||
      typeof data.term !== 'object'
    ) {
      errors.push(`${path}: expected top-level term map only`);
      continue;
    }

    const term = data.term;
    const expectedId = basename(path, '.term.yaml');

    if (term.id !== expectedId) {
      errors.push(`${path}: term.id must match filename stem ${JSON.stringify(expectedId)}`);
    }

    if (!nonEmptyString(term.definition)) {
      errors.push(`${path}: term.definition must be a non-empty string`);
    }

    if ('platform' in term || 'platforms' in term) {
      errors.push(`${path}: platform scope belongs in feature specs, not term files`);
    }

    if (typeof term.id !== 'string' || !TERM_ID.test(term.id)) {
      errors.push(`${path}: term.id must be lower snake case`);
    }

    const names = [term.id, ...(Array.isArray(term.aliases) ? term.aliases : [])];
    for (const name of names) {
      if (!nonEmptyString(name)) {
        continue;
      }
      const normalized = String(name).trim().toLowerCase();
      if (aliasOwners[normalized] && aliasOwners[normalized] !== term.id) {
        warnings.push(
          `${relPath(path)}: alias ${JSON.stringify(name)} also maps to term ${aliasOwners[normalized]}`,
        );
      } else {
        aliasOwners[normalized] = term.id;
      }
    }

    if ('aliases' in term) {
      validateStringArray(path, 'term.aliases', term.aliases);
    }
    if ('notes' in term) {
      validateStringArray(path, 'term.notes', term.notes);
    }

    const allowedTermKeys = new Set(['id', 'definition', 'aliases', 'references', 'notes']);
    for (const key of Object.keys(term)) {
      if (allowedTermKeys.has(key)) {
        continue;
      }
      if (!TERM_ID.test(key)) {
        errors.push(`${path}: term.${key} must use lower snake case`);
        continue;
      }
      if (!requireObject(path, `term.${key}`, term[key])) {
        continue;
      }
      if (!Object.values(term[key]).every((item) => nonEmptyString(item))) {
        errors.push(`${path}: term.${key} must be a compact map of string values`);
      }
    }

    if (!('references' in term)) {
      continue;
    }

    if (!requireObject(path, 'term.references', term.references)) {
      continue;
    }

    const refs = term.references;
    const allowedRefKeys = new Set([
      'prisma',
      'graphql',
      'ui',
      'server',
      'worker',
      'docs',
      'adr',
      'skills',
      'memory',
    ]);
    const unknownRefs = Object.keys(refs).filter((key) => !allowedRefKeys.has(key));
    if (unknownRefs.length > 0) {
      errors.push(`${path}: term.references has unsupported keys ${unknownRefs.join(', ')}`);
    }

    if ('prisma' in refs && requireObject(path, 'term.references.prisma', refs.prisma)) {
      const extraPrismaKeys = Object.keys(refs.prisma).filter(
        (key) => key !== 'models' && key !== 'enums',
      );
      if (extraPrismaKeys.length > 0) {
        errors.push(
          `${path}: term.references.prisma has unsupported keys ${extraPrismaKeys.join(', ')}`,
        );
      }
      if ('models' in refs.prisma) {
        validateNamedReferences(path, 'term.references.prisma.models', refs.prisma.models);
      }
      if ('enums' in refs.prisma) {
        validateNamedReferences(path, 'term.references.prisma.enums', refs.prisma.enums);
      }
    }

    if ('graphql' in refs && requireObject(path, 'term.references.graphql', refs.graphql)) {
      const extraGraphqlKeys = Object.keys(refs.graphql).filter((key) => key !== 'operations');
      if (extraGraphqlKeys.length > 0) {
        errors.push(
          `${path}: term.references.graphql has unsupported keys ${extraGraphqlKeys.join(', ')}`,
        );
      }
      if ('operations' in refs.graphql) {
        validateNamedReferences(
          path,
          'term.references.graphql.operations',
          refs.graphql.operations,
        );
      }
    }

    if ('ui' in refs && requireObject(path, 'term.references.ui', refs.ui)) {
      const extraUiKeys = Object.keys(refs.ui).filter(
        (key) => key !== 'web' && key !== 'native' && key !== 'shared',
      );
      if (extraUiKeys.length > 0) {
        errors.push(`${path}: term.references.ui has unsupported keys ${extraUiKeys.join(', ')}`);
      }
      for (const uiKey of ['web', 'native', 'shared']) {
        if (uiKey in refs.ui) {
          validateStringArray(path, `term.references.ui.${uiKey}`, refs.ui[uiKey]);
        }
      }
    }

    for (const refKey of ['server', 'worker', 'docs', 'adr', 'skills', 'memory']) {
      if (refKey in refs) {
        validateStringArray(path, `term.references.${refKey}`, refs[refKey]);
      }
    }
  }
}

function validateFeatures(platformIds) {
  /** @type {Record<string, string>} */
  const featureNameOwners = {};
  /** @type {Record<string, string[]>} */
  const duplicateRequirementTexts = {};

  for (const path of featureFiles) {
    const loaded = loadYamlFile(path);
    if (reportYamlLoadError(path, loaded)) {
      continue;
    }

    const data = loaded.data;
    if (
      typeof data !== 'object' ||
      Array.isArray(data) ||
      !data.feature ||
      typeof data.feature !== 'object' ||
      !data.components ||
      typeof data.components !== 'object' ||
      !data.constraints ||
      typeof data.constraints !== 'object'
    ) {
      errors.push(`${path}: expected Acai-compatible feature/components/constraints shape`);
      continue;
    }

    const extraTopLevelKeys = Object.keys(data).filter((key) => !FEATURE_TOP_LEVEL_KEYS.has(key));
    if (extraTopLevelKeys.length > 0) {
      errors.push(`${path}: unsupported top-level keys ${extraTopLevelKeys.join(', ')}`);
    }

    const featureName = data.feature.name;
    const expectedFeatureName = basename(path, '.feature.yaml');
    if (featureName !== expectedFeatureName) {
      errors.push(
        `${path}: feature.name ${JSON.stringify(featureName)} must match filename stem ${JSON.stringify(expectedFeatureName)}`,
      );
    }

    if (featureNameOwners[featureName] && featureNameOwners[featureName] !== path) {
      errors.push(
        `${path}: duplicate feature.name ${JSON.stringify(featureName)} also defined in ${featureNameOwners[featureName]}`,
      );
    } else {
      featureNameOwners[featureName] = path;
    }

    if ('product' in data.feature && data.feature.product !== EXPECTED_PRODUCT) {
      errors.push(`${path}: feature.product must be ${JSON.stringify(EXPECTED_PRODUCT)}`);
    }

    const groupKeys = new Set();
    for (const section of ['components', 'constraints']) {
      for (const groupKey of Object.keys(data[section])) {
        if (groupKeys.has(groupKey)) {
          errors.push(
            `${path}: duplicate group key ${groupKey} appears in both components and constraints`,
          );
        }
        groupKeys.add(groupKey);
      }
    }

    for (const section of ['components', 'constraints']) {
      for (const [groupKey, group] of Object.entries(data[section])) {
        if (!GROUP_KEY.test(groupKey)) {
          errors.push(`${path}: ${section}.${groupKey} must use uppercase snake case group keys`);
        }
        const requirements = group?.requirements ?? {};
        for (const [reqKey, req] of Object.entries(requirements)) {
          if (!REQUIREMENT_KEY.test(String(reqKey))) {
            errors.push(
              `${path}: ${section}.${groupKey}.requirements.${reqKey} must use numeric keys like 1 or 1-1`,
            );
            continue;
          }
          const id = `${featureName}.${groupKey}.${reqKey}`;
          if (specIds[id]) {
            errors.push(`${path}: duplicate ACID ${id} also defined in ${specIds[id]}`);
          }
          specIds[id] = path;

          const text = requirementText(req);
          if (nonEmptyString(text)) {
            specIdMeta[id] = { path, feature: featureName, text };
            validateEmphasizedTerms(path, id, text);

            const normalized = normalizeRequirementText(text);
            if (!duplicateRequirementTexts[normalized]) {
              duplicateRequirementTexts[normalized] = [];
            }
            duplicateRequirementTexts[normalized].push(id);
          }

          const note = req && typeof req === 'object' && req.note ? String(req.note) : '';
          for (const match of note.matchAll(/(?:^|\n)\s*platforms:\s*([a-z0-9_, ]+)/g)) {
            for (const raw of match[1].split(',')) {
              const platformId = raw.trim();
              if (!platformId) {
                continue;
              }
              if (!platformIds.includes(platformId)) {
                errors.push(
                  `${path}: ${id} references unknown platform ${JSON.stringify(platformId)}`,
                );
              }
            }
          }
        }
      }
    }
  }

  for (const [text, ids] of Object.entries(duplicateRequirementTexts)) {
    if (ids.length < 2) {
      continue;
    }
    warnings.push(
      `duplicate requirement text across ${ids.join(', ')} (${text.slice(0, 80)}${text.length > 80 ? '...' : ''})`,
    );
  }
}

function collectTestRefs() {
  /** @type {Record<string, number>} */
  const testRefs = {};
  const seen = new Set();
  for (const scanRoot of testScanRoots) {
    for (const path of findTestFiles(scanRoot).sort()) {
      if (seen.has(path)) {
        continue;
      }
      seen.add(path);

      const rel = relative(ROOT, path);
      if (rel.split(/[/\\]/).some((part) => TEST_SCAN_SKIP_DIRS.has(part))) {
        continue;
      }

      const text = readFileSync(path, 'utf8');
      for (const match of text.matchAll(ACID)) {
        const id = match[1];
        testRefs[id] = (testRefs[id] ?? 0) + 1;
      }
    }
  }
  return testRefs;
}

function printDiagnostics(options = {}) {
  const { exitOnError = true } = options;
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nErrors:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    if (exitOnError) {
      process.exit(1);
    }
  }
}

/**
 * @param {{ root?: string, scanTests?: boolean }} [options]
 */
export function runValidation(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const scanTests = options.scanTests ?? true;

  resetValidationState(root);

  for (const referenceFile of referenceFiles) {
    if (!existsSync(referenceFile)) {
      continue;
    }
    reportYamlLoadError(referenceFile, loadYamlFile(referenceFile));
  }

  /** @type {string[]} */
  let platformIds = [];
  const platformsLoaded = loadYamlFile(platformFile);
  if (!existsSync(platformFile)) {
    errors.push(`${platformFile}: missing platforms file`);
  } else if (!reportYamlLoadError(platformFile, platformsLoaded)) {
    const platformsData = platformsLoaded.data;
    if (platformsData?.platforms && typeof platformsData.platforms === 'object') {
      platformIds = Object.keys(platformsData.platforms);
    } else {
      errors.push(`${platformFile}: expected top-level platforms map`);
    }
  }

  buildTermPhraseIndex();
  validateFeatures(platformIds);
  validateTerms();

  const testRefs = scanTests ? collectTestRefs() : {};
  if (scanTests) {
    applyTestRefChecks(testRefs);
  }

  return {
    root,
    errors: [...errors],
    warnings: [...warnings],
    specIds: { ...specIds },
    testRefs: { ...testRefs },
    featureFiles: [...featureFiles],
    termFiles: [...termFiles],
  };
}

function applyTestRefChecks(testRefs) {
  const orphans = Object.keys(testRefs)
    .filter((id) => !(id in specIds))
    .sort();
  for (const id of orphans) {
    errors.push(`test reference ${id} has no matching feature requirement`);
  }

  for (const [id, count] of Object.entries(testRefs)
    .filter(([, count]) => count > 15)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) {
    warnings.push(`${id} is referenced ${count} times; verify this is not bucket tagging`);
  }
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    process.exit(0);
  }
  if (cli.unknownArgs.length > 0) {
    console.error(`Unknown argument(s): ${cli.unknownArgs.join(', ')}`);
    printHelp();
    process.exit(1);
  }

  const result = runValidation({ root: cli.root, scanTests: true });

  if (cli.coverageMode) {
    if (result.errors.length > 0) {
      printDiagnostics({ exitOnError: false });
    }
    printCoverageReport(result.testRefs, cli.jsonOutput);
    if (result.warnings.length > 0 && !cli.jsonOutput) {
      console.log('\nWarnings:');
      for (const warning of result.warnings) {
        console.log(`- ${warning}`);
      }
    }
    process.exit(0);
  }

  printSummary(result.testRefs);
  printDiagnostics();
}

function printSummary(testRefs) {
  const orphans = Object.keys(testRefs)
    .filter((id) => !(id in specIds))
    .sort();
  const uncoveredCount = Object.keys(specIds).filter((id) => !(id in testRefs)).length;
  const totalTestRefs = Object.values(testRefs).reduce((sum, count) => sum + count, 0);

  console.log(`Feature specs: ${featureFiles.length}`);
  console.log(`Glossary terms: ${termFiles.length}`);
  console.log(`Spec ACIDs: ${Object.keys(specIds).length}`);
  console.log(`Unique ACIDs in tests: ${Object.keys(testRefs).length}`);
  console.log(`Total test ACID refs: ${totalTestRefs}`);
  console.log(`Orphan test refs: ${orphans.length}`);
  console.log(`Uncovered spec ACIDs: ${uncoveredCount}`);
}

function buildCoverageReport(testRefs) {
  /** @type {Record<string, { total: number, covered: string[], uncovered: string[] }>} */
  const byFeature = {};

  for (const id of Object.keys(specIds).sort()) {
    const feature = specIdMeta[id]?.feature ?? id.split('.', 1)[0];
    if (!byFeature[feature]) {
      byFeature[feature] = { total: 0, covered: [], uncovered: [] };
    }
    byFeature[feature].total += 1;
    if (id in testRefs) {
      byFeature[feature].covered.push(id);
    } else {
      byFeature[feature].uncovered.push(id);
    }
  }

  const features = Object.keys(byFeature).sort();
  const total = Object.keys(specIds).length;
  const covered = Object.keys(specIds).filter((id) => id in testRefs).length;

  return {
    summary: {
      featureSpecs: featureFiles.length,
      glossaryTerms: termFiles.length,
      specAcids: total,
      coveredAcids: covered,
      uncoveredAcids: total - covered,
      coveragePercent: total === 0 ? 0 : Number(((covered / total) * 100).toFixed(1)),
      uniqueAcidsInTests: Object.keys(testRefs).length,
      totalTestAcidRefs: Object.values(testRefs).reduce((sum, count) => sum + count, 0),
    },
    features: features.map((feature) => {
      const entry = byFeature[feature];
      const featureCovered = entry.covered.length;
      return {
        feature,
        total: entry.total,
        covered: featureCovered,
        uncovered: entry.uncovered.length,
        coveragePercent:
          entry.total === 0 ? 0 : Number(((featureCovered / entry.total) * 100).toFixed(1)),
        coveredAcids: entry.covered.sort(),
        uncoveredAcids: entry.uncovered.sort(),
        testRefCounts: Object.fromEntries(
          entry.covered
            .map((id) => [id, testRefs[id] ?? 0])
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
        ),
      };
    }),
  };
}

function printCoverageReport(testRefs, jsonOutput = false) {
  const report = buildCoverageReport(testRefs);

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Requirement test coverage');
  console.log('=========================');
  console.log(
    `Overall: ${report.summary.coveredAcids}/${report.summary.specAcids} (${report.summary.coveragePercent}%)`,
  );
  console.log('');

  for (const feature of report.features) {
    console.log(
      `${feature.feature}: ${feature.covered}/${feature.total} (${feature.coveragePercent}%)`,
    );
    if (feature.uncoveredAcids.length > 0) {
      console.log('  uncovered:');
      for (const id of feature.uncoveredAcids) {
        console.log(`    - ${id}`);
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
