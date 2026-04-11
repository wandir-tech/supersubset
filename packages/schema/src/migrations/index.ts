/**
 * Schema migrations — v0.x is explicitly unstable.
 *
 * The parser path uses this module to normalize older dashboard documents into
 * the current canonical shape before Zod validation runs.
 */
import { dashboardDefinitionSchema } from '../validation';
import type {
	BreakpointOverride,
	DashboardDefinition,
	LayoutComponent,
	LayoutComponentType,
	LayoutMap,
} from '../types';

export const CURRENT_SCHEMA_VERSION = '0.2.0';

const SUPPORTED_SCHEMA_VERSIONS = new Set(['0.1.0', CURRENT_SCHEMA_VERSION]);
const CURRENT_LAYOUT_TYPES = new Set<LayoutComponentType>([
	'root',
	'grid',
	'row',
	'column',
	'widget',
	'tabs',
	'tab',
	'spacer',
	'header',
	'divider',
]);

type JsonRecord = Record<string, unknown>;

export function isSupportedSchemaVersion(version: string): boolean {
	return SUPPORTED_SCHEMA_VERSIONS.has(version);
}

export function migrateDashboardDefinition(raw: unknown): DashboardDefinition {
	const migrated = migrateDocument(raw);
	return dashboardDefinitionSchema.parse(migrated) as DashboardDefinition;
}

function migrateDocument(raw: unknown): unknown {
	const document = expectRecord(raw, 'Dashboard definition must be an object');
	const schemaVersion = readString(document.schemaVersion);

	if (!schemaVersion) {
		throw new Error('Dashboard definition is missing schemaVersion');
	}

	if (!isSupportedSchemaVersion(schemaVersion)) {
		throw new Error(
			`Unsupported schemaVersion "${schemaVersion}". Supported versions: ${Array.from(SUPPORTED_SCHEMA_VERSIONS).join(', ')}`,
		);
	}

	let migrated = document;

	if (schemaVersion === '0.1.0') {
		migrated = migrateV010ToV020(document);
	}

	return normalizeLegacyCurrentShapes(migrated);
}

function migrateV010ToV020(document: JsonRecord): JsonRecord {
	const migrated: JsonRecord = {
		...document,
		schemaVersion: CURRENT_SCHEMA_VERSION,
	};

	if (typeof migrated.dataModelRef === 'string' && !isRecord(migrated.dataModel)) {
		migrated.dataModel = {
			type: 'external',
			externalRef: migrated.dataModelRef,
		};
	}
	delete migrated.dataModelRef;

	if (Array.isArray(migrated.pages)) {
		migrated.pages = migrated.pages.map((page, index) => migrateLegacyPage(page, index));
	}

	return migrated;
}

function normalizeLegacyCurrentShapes(document: JsonRecord): JsonRecord {
	const normalized: JsonRecord = { ...document };

	if (typeof normalized.dataModelRef === 'string' && !isRecord(normalized.dataModel)) {
		normalized.dataModel = {
			type: 'external',
			externalRef: normalized.dataModelRef,
		};
	}
	delete normalized.dataModelRef;

	if (Array.isArray(normalized.pages)) {
		normalized.pages = normalized.pages.map((page, index) => migrateLegacyPage(page, index));
	}

	if (Array.isArray(normalized.interactions)) {
		normalized.interactions = normalized.interactions.map(normalizeInteractionDefinition);
	}

	normalized.schemaVersion = CURRENT_SCHEMA_VERSION;

	return normalized;
}

function migrateLegacyPage(page: unknown, pageIndex: number): unknown {
	if (!isRecord(page)) {
		return page;
	}

	const migrated: JsonRecord = { ...page };
	const layout = migrated.layout;

	if (isLegacyRecursiveLayout(layout)) {
		const flattened = flattenLegacyLayout(layout, pageIndex);
		migrated.layout = flattened.layout;
		migrated.rootNodeId = flattened.rootNodeId;
		return migrated;
	}

	if (isLayoutMap(layout) && !readString(migrated.rootNodeId)) {
		const inferredRootNodeId = inferRootNodeId(layout);
		if (inferredRootNodeId) {
			migrated.rootNodeId = inferredRootNodeId;
		}
	}

	return migrated;
}

function normalizeInteractionDefinition(interaction: unknown): unknown {
	if (!isRecord(interaction)) {
		return interaction;
	}

	const normalized: JsonRecord = { ...interaction };
	if (isRecord(normalized.action) && normalized.action.type === 'navigate') {
		normalized.action = normalizeNavigateAction(normalized.action);
	}

	return normalized;
}

function normalizeNavigateAction(action: JsonRecord): JsonRecord {
	if (isRecord(action.target)) {
		return {
			...action,
			target: normalizeNavigateTarget(action.target),
		};
	}

	if (typeof action.target === 'string') {
		return {
			...omitKeys(action, ['target', 'pageId', 'dashboardId', 'filterMapping', 'onMappingFailure']),
			target: { kind: 'page', pageId: action.target },
		};
	}

	if (typeof action.pageId === 'string') {
		return {
			...omitKeys(action, ['pageId', 'dashboardId', 'filterMapping', 'onMappingFailure']),
			target: { kind: 'page', pageId: action.pageId },
		};
	}

	if (typeof action.dashboardId === 'string') {
		return {
			...omitKeys(action, ['pageId', 'dashboardId', 'filterMapping', 'onMappingFailure']),
			target: compactRecord({
				kind: 'dashboard',
				dashboardId: action.dashboardId,
				filterMapping: Array.isArray(action.filterMapping) ? action.filterMapping : undefined,
				onMappingFailure: readString(action.onMappingFailure),
			}),
		};
	}

	return action;
}

function normalizeNavigateTarget(target: JsonRecord): JsonRecord {
	const kind = readString(target.kind);

	if (kind === 'page' || kind === 'dashboard') {
		return target;
	}

	if (typeof target.pageId === 'string') {
		return {
			kind: 'page',
			pageId: target.pageId,
		};
	}

	if (typeof target.dashboardId === 'string') {
		return compactRecord({
			kind: 'dashboard',
			dashboardId: target.dashboardId,
			filterMapping: Array.isArray(target.filterMapping) ? target.filterMapping : undefined,
			onMappingFailure: readString(target.onMappingFailure),
		});
	}

	return target;
}

function flattenLegacyLayout(layoutRoot: JsonRecord, pageIndex: number): {
	layout: LayoutMap;
	rootNodeId: string;
} {
	const layout: LayoutMap = {};
	const usedIds = new Set<string>();
	const flattenedRoot = flattenLegacyLayoutNode(layoutRoot, undefined, [pageIndex], layout, usedIds);

	if (flattenedRoot.type === 'root') {
		return {
			layout,
			rootNodeId: flattenedRoot.id,
		};
	}

	const syntheticRootId = reserveNodeId(`migrated-root-${pageIndex}`, usedIds);
	layout[syntheticRootId] = {
		id: syntheticRootId,
		type: 'root',
		children: [flattenedRoot.id],
		meta: {},
	};
	layout[flattenedRoot.id] = {
		...layout[flattenedRoot.id],
		parentId: syntheticRootId,
	};

	return {
		layout,
		rootNodeId: syntheticRootId,
	};
}

function flattenLegacyLayoutNode(
	node: JsonRecord,
	parentId: string | undefined,
	path: number[],
	layout: LayoutMap,
	usedIds: Set<string>,
): LayoutComponent {
	const rawChildren = Array.isArray(node.children) ? node.children.filter(isRecord) : [];
	const type = normalizeLegacyLayoutType(node, rawChildren.length > 0, parentId === undefined);
	const id = reserveNodeId(readString(node.id) ?? `migrated-${type}-${path.join('-')}`, usedIds);
	const childIds = rawChildren.map((child, childIndex) =>
		flattenLegacyLayoutNode(child, id, [...path, childIndex], layout, usedIds).id,
	);

	const component: LayoutComponent = {
		id,
		type,
		children: childIds,
		...(parentId ? { parentId } : {}),
		meta: buildLegacyLayoutMeta(node),
	};

	layout[id] = component;

	return component;
}

function normalizeLegacyLayoutType(
	node: JsonRecord,
	hasChildren: boolean,
	isTopLevel: boolean,
): LayoutComponentType {
	const rawType = readString(node.type);
	if (rawType && CURRENT_LAYOUT_TYPES.has(rawType as LayoutComponentType)) {
		return rawType as LayoutComponentType;
	}

	const props = toOptionalRecord(node.props);
	const direction = readString(props?.direction);

	switch (rawType) {
		case 'flex':
			return direction === 'column' ? 'column' : 'row';
		case 'stack':
			return 'column';
		case 'tabset':
			return 'tabs';
		case 'pane':
		case 'panel':
			return 'tab';
		case 'text':
		case 'title':
			return 'header';
		case 'separator':
			return 'divider';
		case 'space':
			return 'spacer';
		default:
			break;
	}

	if (hasWidgetReference(node)) {
		return 'widget';
	}

	if (isTopLevel) {
		return 'grid';
	}

	return hasChildren ? 'row' : 'spacer';
}

function buildLegacyLayoutMeta(node: JsonRecord): LayoutComponent['meta'] {
	const props = toOptionalRecord(node.props);
	const meta = toOptionalRecord(node.meta);

	return compactRecord({
		width: toPositiveInt(meta?.width ?? props?.width),
		height: toPositiveInt(meta?.height ?? props?.height),
		gap: firstString(meta?.gap, props?.gap),
		columns: toPositiveInt(meta?.columns ?? props?.columns),
		minHeight: firstString(meta?.minHeight, props?.minHeight),
		widgetRef: firstString(
			meta?.widgetRef,
			meta?.widgetId,
			props?.widgetRef,
			props?.widgetId,
			props?.widget,
			node.widgetRef,
			node.widgetId,
		),
		text: firstString(meta?.text, props?.text, props?.title, props?.label, node.title),
		headerSize: normalizeHeaderSize(firstString(meta?.headerSize, props?.headerSize, props?.size)),
		background: firstString(meta?.background, props?.background),
		breakpoints: normalizeBreakpoints(meta?.breakpoints ?? props?.breakpoints),
	});
}

function normalizeHeaderSize(value: string | undefined): 'small' | 'medium' | 'large' | undefined {
	if (value === 'small' || value === 'medium' || value === 'large') {
		return value;
	}
	if (value === 'sm') return 'small';
	if (value === 'md') return 'medium';
	if (value === 'lg') return 'large';
	return undefined;
}

function normalizeBreakpoints(value: unknown): BreakpointOverride[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}

	const breakpoints: BreakpointOverride[] = [];

	for (const entry of value) {
		if (!isRecord(entry)) {
			continue;
		}

		const maxWidth = toPositiveNumber(entry.maxWidth);
		if (maxWidth === undefined) {
			continue;
		}

		const columns = toPositiveInt(entry.columns);
		const hidden = typeof entry.hidden === 'boolean' ? entry.hidden : undefined;
		const width = toPositiveInt(entry.width);

		breakpoints.push({
			maxWidth,
			...(columns !== undefined ? { columns } : {}),
			...(hidden !== undefined ? { hidden } : {}),
			...(width !== undefined ? { width } : {}),
		});
	}

	return breakpoints.length > 0 ? breakpoints : undefined;
}

function hasWidgetReference(node: JsonRecord): boolean {
	const props = toOptionalRecord(node.props);
	const meta = toOptionalRecord(node.meta);

	return Boolean(
		firstString(
			meta?.widgetRef,
			meta?.widgetId,
			props?.widgetRef,
			props?.widgetId,
			props?.widget,
			node.widgetRef,
			node.widgetId,
		),
	);
}

function isLegacyRecursiveLayout(value: unknown): value is JsonRecord {
	return isRecord(value) && typeof value.type === 'string' && Array.isArray(value.children);
}

function isLayoutMap(value: unknown): value is LayoutMap {
	return (
		isRecord(value) &&
		Object.values(value).every(
			(entry) => isRecord(entry) && typeof entry.type === 'string' && Array.isArray(entry.children),
		)
	);
}

function inferRootNodeId(layout: LayoutMap): string | undefined {
	const explicitRoot = Object.values(layout).find((node) => node.type === 'root');
	if (explicitRoot) {
		return explicitRoot.id;
	}

	const topLevelNode = Object.values(layout).find((node) => !node.parentId);
	return topLevelNode?.id ?? Object.keys(layout)[0];
}

function reserveNodeId(baseId: string, usedIds: Set<string>): string {
	let candidate = baseId;
	let suffix = 1;
	while (usedIds.has(candidate)) {
		candidate = `${baseId}-${suffix}`;
		suffix += 1;
	}
	usedIds.add(candidate);
	return candidate;
}

function omitKeys(record: JsonRecord, keys: string[]): JsonRecord {
	const next: JsonRecord = { ...record };
	for (const key of keys) {
		delete next[key];
	}
	return next;
}

function compactRecord<T extends JsonRecord>(record: T): T {
	const next: JsonRecord = {};
	for (const [key, value] of Object.entries(record)) {
		if (value !== undefined) {
			next[key] = value;
		}
	}
	return next as T;
}

function expectRecord(value: unknown, message: string): JsonRecord {
	if (!isRecord(value)) {
		throw new Error(message);
	}
	return value;
}

function toOptionalRecord(value: unknown): JsonRecord | undefined {
	return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function firstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
	}
	return undefined;
}

function toPositiveInt(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return undefined;
	}
	return Math.floor(parsed);
}

function toPositiveNumber(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return undefined;
	}
	return parsed;
}
