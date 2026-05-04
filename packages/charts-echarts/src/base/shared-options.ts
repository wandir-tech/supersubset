/**
 * Shared chart option builders — reusable ECharts option fragments consumed by all widgets.
 *
 * The default color palette ('supersetColors') is adapted from Apache Superset's
 * categorical color scheme. See NOTICE for attribution.
 *
 * Each builder reads from the generic `config: Record<string, unknown>` passed via WidgetProps.
 * Widgets call these builders and spread/merge the result into their ECharts option objects.
 *
 * Shared config keys (all optional, sensible defaults):
 *   colorScheme   — named palette string  (default 'supersetColors')
 *   showLegend    — boolean               (default undefined → auto)
 *   legendPosition— 'top'|'bottom'|'left'|'right'  (default 'top')
 *   legendType    — 'plain'|'scroll'      (default 'plain')
 *   showValues    — boolean               (default false)
 *   numberFormat  — D3-style format string (default '')
 *   tooltipTrigger— 'axis'|'item'|'none'  (default per-chart)
 *   xAxisTitle    — string
 *   yAxisTitle    — string
 *   xAxisLabelRotate — number             (default 0)
 *   yAxisMin      — number | null
 *   yAxisMax      — number | null
 *   logAxis       — boolean               (default false)
 *   zoomable      — boolean               (default false)
 */

// ─── Color Palettes ──────────────────────────────────────────

const PALETTES: Record<string, string[]> = {
  supersetColors: [
    '#1FA8C9',
    '#454E7C',
    '#5AC189',
    '#FF7F44',
    '#666666',
    '#E04355',
    '#FCC700',
    '#A868B7',
    '#3CCCCB',
    '#A38F79',
  ],
  d3Category10: [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
  ],
  google10: [
    '#3366CC',
    '#DC3912',
    '#FF9900',
    '#109618',
    '#990099',
    '#0099C6',
    '#DD4477',
    '#66AA00',
    '#B82E2E',
    '#316395',
  ],
  tableau10: [
    '#4E79A7',
    '#F28E2B',
    '#E15759',
    '#76B7B2',
    '#59A14F',
    '#EDC948',
    '#B07AA1',
    '#FF9DA7',
    '#9C755F',
    '#BAB0AC',
  ],
  pastel: [
    '#AEC7E8',
    '#FFBB78',
    '#98DF8A',
    '#FF9896',
    '#C5B0D5',
    '#C49C94',
    '#F7B6D2',
    '#C7C7C7',
    '#DBDB8D',
    '#9EDAE5',
  ],
  dark: [
    '#1B9E77',
    '#D95F02',
    '#7570B3',
    '#E7298A',
    '#66A61E',
    '#E6AB02',
    '#A6761D',
    '#666666',
    '#1D91C0',
    '#AE017E',
  ],
  warm: [
    '#FE4A49',
    '#FED766',
    '#F77F00',
    '#E36414',
    '#9A031E',
    '#D00000',
    '#DC2F02',
    '#E85D04',
    '#FAA307',
    '#FFBA08',
  ],
  cool: [
    '#264653',
    '#2A9D8F',
    '#E9C46A',
    '#F4A261',
    '#E76F51',
    '#023E8A',
    '#0077B6',
    '#0096C7',
    '#00B4D8',
    '#48CAE4',
  ],
};

const DEFAULT_PALETTE = 'supersetColors';

/**
 * Get color palette array by name.
 */
export function getColorPalette(scheme?: string): string[] {
  return PALETTES[scheme ?? DEFAULT_PALETTE] ?? PALETTES[DEFAULT_PALETTE];
}

/**
 * Get all available palette names.
 */
export function getAvailablePalettes(): string[] {
  return Object.keys(PALETTES);
}

// ─── Shared Option Builders ──────────────────────────────────

export interface SharedConfig {
  colorScheme?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  legendType?: 'plain' | 'scroll';
  showValues?: boolean;
  numberFormat?: string;
  tooltipTrigger?: 'axis' | 'item' | 'none';
  xAxisTitle?: string;
  yAxisTitle?: string;
  xAxisLabelRotate?: number;
  yAxisMin?: number | null;
  yAxisMax?: number | null;
  logAxis?: boolean;
  zoomable?: boolean;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

/**
 * Extract shared config from generic WidgetProps config record.
 */
export function extractSharedConfig(config: Record<string, unknown>): SharedConfig {
  return {
    colorScheme: config.colorScheme as string | undefined,
    showLegend: toOptionalBoolean(config.showLegend),
    legendPosition: config.legendPosition as SharedConfig['legendPosition'],
    legendType: config.legendType as SharedConfig['legendType'],
    showValues: toOptionalBoolean(config.showValues),
    numberFormat: config.numberFormat as string | undefined,
    tooltipTrigger: config.tooltipTrigger as SharedConfig['tooltipTrigger'],
    xAxisTitle: config.xAxisTitle as string | undefined,
    yAxisTitle: config.yAxisTitle as string | undefined,
    xAxisLabelRotate: config.xAxisLabelRotate as number | undefined,
    yAxisMin: config.yAxisMin as number | null | undefined,
    yAxisMax: config.yAxisMax as number | null | undefined,
    logAxis: toOptionalBoolean(config.logAxis),
    zoomable: toOptionalBoolean(config.zoomable),
  };
}

/**
 * Build ECharts title option.
 * Returns the title config if a non-empty title is provided, otherwise undefined.
 */
export function buildTitleOption(title?: string): Record<string, unknown> | undefined {
  if (!title) return undefined;
  return {
    text: title,
    left: 'center',
    top: 0,
    textStyle: { fontSize: 14, fontWeight: 'bold' as const, color: '#333' },
  };
}

/**
 * Build ECharts color option from shared config.
 */
export function buildColorOption(shared: SharedConfig): string[] {
  return getColorPalette(shared.colorScheme);
}

/**
 * Build ECharts legend option.
 * @param shared       Shared config
 * @param seriesNames  Array of series names (for auto-show logic)
 */
export function buildLegendOption(
  shared: SharedConfig,
  seriesNames?: string[],
  hasTitle = false,
): Record<string, unknown> | undefined {
  // Auto: show when multiple series
  const shouldShow = shared.showLegend ?? (seriesNames ? seriesNames.length > 1 : undefined);
  if (shouldShow === false) return undefined;

  const position = shared.legendPosition ?? 'top';
  const orient = position === 'left' || position === 'right' ? 'vertical' : 'horizontal';

  const legend: Record<string, unknown> = {
    show: true,
    type: shared.legendType ?? 'plain',
    orient,
    data: seriesNames,
  };

  switch (position) {
    case 'top':
      legend.top = hasTitle ? 28 : 0;
      legend.left = 'center';
      break;
    case 'bottom':
      legend.bottom = 0;
      legend.left = 'center';
      break;
    case 'left':
      legend.left = 'left';
      legend.top = 'middle';
      break;
    case 'right':
      legend.right = 0;
      legend.top = 'middle';
      break;
  }

  return legend;
}

/**
 * Build ECharts tooltip option.
 * @param shared          Shared config
 * @param defaultTrigger  Widget-specific default trigger
 */
export function buildTooltipOption(
  shared: SharedConfig,
  defaultTrigger: 'axis' | 'item' = 'axis',
): Record<string, unknown> | undefined {
  const trigger = shared.tooltipTrigger ?? defaultTrigger;
  if (trigger === 'none') return { show: false };
  return { trigger };
}

/**
 * Build ECharts grid option with sensible defaults.
 * Accounts for legend position to add spacing.
 */
export function buildGridOption(
  shared: SharedConfig,
  layout?: { hasTitle?: boolean; hasLegend?: boolean; zoomAxis?: 'x' | 'y' },
): Record<string, unknown> {
  const grid: Record<string, unknown> = {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  };

  const hasTitle = layout?.hasTitle === true;
  const hasLegend = layout?.hasLegend !== false && shared.showLegend !== false;

  if (hasTitle) {
    grid.top = 36;
  }

  // Add top padding if legend is at the top
  if (hasLegend) {
    const pos = shared.legendPosition ?? 'top';
    if (pos === 'top') grid.top = hasTitle ? 68 : 40;
    if (pos === 'bottom') grid.bottom = 40;
    if (pos === 'left') grid.left = '15%';
    if (pos === 'right') grid.right = '12%';
  }

  if (shared.yAxisTitle && grid.left === '3%') {
    grid.left = '10%';
  }

  if (shared.xAxisTitle) {
    grid.bottom = typeof grid.bottom === 'number' ? (grid.bottom as number) + 28 : '10%';
  }

  // Reserve space for data zoom controls on the axis they target.
  if (shared.zoomable) {
    if (layout?.zoomAxis === 'y') {
      grid.right = typeof grid.right === 'number' ? (grid.right as number) + 40 : '12%';
    } else {
      grid.bottom = typeof grid.bottom === 'number' ? (grid.bottom as number) + 40 : '12%';
    }
  }

  return grid;
}

/**
 * Build category axis option (for xAxis typically).
 */
export function buildCategoryAxisOption(
  shared: SharedConfig,
  categoryData: string[],
  axis: 'x' | 'y' = 'x',
): Record<string, unknown> {
  const axisOpt: Record<string, unknown> = {
    type: 'category',
    data: categoryData,
  };

  const title = axis === 'x' ? shared.xAxisTitle : shared.yAxisTitle;
  if (title) {
    axisOpt.name = title;
    axisOpt.nameLocation = 'middle';
    axisOpt.nameGap = axis === 'x' ? 32 : 48;
  }

  if (axis === 'x' && shared.xAxisLabelRotate) {
    axisOpt.axisLabel = { rotate: shared.xAxisLabelRotate };
  }

  return axisOpt;
}

/**
 * Build value axis option (for yAxis typically).
 */
export function buildValueAxisOption(
  shared: SharedConfig,
  axis: 'x' | 'y' = 'y',
): Record<string, unknown> {
  const axisOpt: Record<string, unknown> = {
    type: shared.logAxis && axis === 'y' ? 'log' : 'value',
  };

  const title = axis === 'x' ? shared.xAxisTitle : shared.yAxisTitle;
  if (title) {
    axisOpt.name = title;
    axisOpt.nameLocation = 'middle';
    axisOpt.nameGap = axis === 'x' ? 32 : 48;
  }

  if (axis === 'y') {
    if (shared.yAxisMin != null) axisOpt.min = shared.yAxisMin;
    if (shared.yAxisMax != null) axisOpt.max = shared.yAxisMax;
  }

  if (shared.numberFormat) {
    axisOpt.axisLabel = { formatter: (v: number) => formatNumber(v, shared.numberFormat!) };
  }

  return axisOpt;
}

/**
 * Build data zoom option for slider-based zoom.
 */
export function buildDataZoomOption(
  shared: SharedConfig,
  axis: 'x' | 'y' = 'x',
): Array<Record<string, unknown>> | undefined {
  if (!shared.zoomable) return undefined;

  if (axis === 'y') {
    return [
      { type: 'slider', yAxisIndex: 0, orient: 'vertical' },
      { type: 'inside', yAxisIndex: 0, orient: 'vertical' },
    ];
  }

  return [
    { type: 'slider', xAxisIndex: 0 },
    { type: 'inside', xAxisIndex: 0 },
  ];
}

/**
 * Build label option for showing values on data points.
 */
export function buildLabelOption(shared: SharedConfig): Record<string, unknown> | undefined {
  if (!shared.showValues) return undefined;
  const label: Record<string, unknown> = {
    show: true,
    position: 'top',
  };
  if (shared.numberFormat) {
    label.formatter = (params: { value: unknown }) => {
      const v =
        typeof params.value === 'number'
          ? params.value
          : Array.isArray(params.value)
            ? Number(params.value[1] ?? 0)
            : Number(params.value ?? 0);
      return formatNumber(v, shared.numberFormat!);
    };
  }
  return label;
}

// ─── Number Formatting ───────────────────────────────────────

/**
 * Format a number using a simple format string.
 * Supported formats:
 *   '.2f'     → 2 decimal places  (1234.56)
 *   '.0f'     → integer           (1235)
 *   '.2%'     → percentage × 100  (12.35%)
 *   ',.0f'    → thousands comma   (1,235)
 *   ',.2f'    → comma + decimals  (1,234.56)
 *   '$,.2f'   → dollar + comma    ($1,234.56)
 *   '$,.0f'   → dollar integer    ($1,235)
 *   '.2s'     → SI suffix         (1.2K)
 *   ''        → default toString
 */
export function formatNumber(value: number, format: string): string {
  if (!format) return String(value);

  const prefix = format.startsWith('$') ? '$' : '';
  const spec = prefix ? format.slice(1) : format;

  const useComma = spec.startsWith(',') || spec.startsWith(',.');
  const rest = useComma ? spec.replace(/^,\.?/, '.') : spec;

  // Parse .Xf or .X% or .Xs
  const match = rest.match(/^\.(\d+)([f%s])$/);
  if (!match) return String(value);

  const precision = parseInt(match[1], 10);
  const type = match[2];

  let result: string;
  if (type === '%') {
    result = (value * 100).toFixed(precision) + '%';
  } else if (type === 's') {
    result = formatSI(value, precision);
  } else {
    result = value.toFixed(precision);
  }

  if (useComma && type !== 's') {
    const parts = result.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    result = parts.join('.');
  }

  return prefix + result;
}

function formatSI(value: number, precision: number): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let tier = 0;
  let scaled = Math.abs(value);
  while (scaled >= 1000 && tier < suffixes.length - 1) {
    scaled /= 1000;
    tier++;
  }
  const sign = value < 0 ? '-' : '';
  return sign + scaled.toFixed(precision) + suffixes[tier];
}
