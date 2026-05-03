import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test';

const VIEWPORT = { width: 1440, height: 900 };
const RENDER_WAIT_MS = 900;

type DesignerPageId = 'page-overview' | 'page-gallery';

type ViewerSurface = {
  pageButton?: string;
  nodeId: string;
  selector: string;
};

const viewerSurfaces: Record<string, ViewerSurface> = {
  'chart-revenue-trend': { nodeId: 'w-line', selector: '.ss-chart' },
  'chart-region-sales': { nodeId: 'w-bar', selector: '.ss-chart' },
  'chart-pie': { pageButton: 'Chart Gallery', nodeId: 'w-pie', selector: '.ss-chart' },
  'chart-scatter': { pageButton: 'Chart Gallery', nodeId: 'w-scatter', selector: '.ss-chart' },
  'chart-area': { pageButton: 'Chart Gallery', nodeId: 'w-area', selector: '.ss-chart' },
  'chart-combo': { pageButton: 'Chart Gallery', nodeId: 'w-combo', selector: '.ss-chart' },
  'chart-heatmap': { pageButton: 'Chart Gallery', nodeId: 'w-heatmap', selector: '.ss-chart' },
  'chart-radar': { pageButton: 'Chart Gallery', nodeId: 'w-radar', selector: '.ss-chart' },
  'chart-funnel': { pageButton: 'Chart Gallery', nodeId: 'w-funnel', selector: '.ss-chart' },
  'chart-treemap': { pageButton: 'Chart Gallery', nodeId: 'w-treemap', selector: '.ss-chart' },
  'chart-sankey': { pageButton: 'Chart Gallery', nodeId: 'w-sankey', selector: '.ss-chart' },
  'chart-waterfall': { pageButton: 'Chart Gallery', nodeId: 'w-waterfall', selector: '.ss-chart' },
  'chart-boxplot': { pageButton: 'Chart Gallery', nodeId: 'w-boxplot', selector: '.ss-chart' },
  'chart-gauge': { pageButton: 'Chart Gallery', nodeId: 'w-gauge', selector: '.ss-chart' },
  'table-orders': { nodeId: 'w-table', selector: '.ss-table' },
  'kpi-revenue': { nodeId: 'w-kpi-revenue', selector: '.ss-kpi' },
};

test.describe('Designer chart matrix certification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const debugWindow = window as Window & {
        __SUPERSUBSET_ENABLE_CHART_TEST_HOOKS__?: boolean;
      };
      debugWindow.__SUPERSUBSET_ENABLE_CHART_TEST_HOOKS__ = true;
    });
    await page.setViewportSize(VIEWPORT);
  });

  test('shared chart engine proves legend placement, formatted values, and click payload propagation', async ({
    page,
  }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'chart-region-sales');
    await setRadioField(page, 'chart-region-sales', 'showLegend', 'Yes');
    await setSelectField(page, 'chart-region-sales', 'legendPosition', 'bottom');
    await setRadioField(page, 'chart-region-sales', 'showValues', 'Yes');
    await setSelectField(page, 'chart-region-sales', 'numberFormat', '.1s');

    const previewChart = await getDesignerPreviewSurface(page, 'chart-region-sales');
    await expectBaseChartOption(previewChart, (option) => {
      const legend = getLegendOption(option);
      const series = getSeriesList(option);

      expect(legend).toEqual(
        expect.objectContaining({
          bottom: 0,
          left: 'center',
          orient: 'horizontal',
        }),
      );
      expect(series[0]).toEqual(
        expect.objectContaining({
          type: 'bar',
          label: expect.objectContaining({
            show: true,
            position: 'top',
          }),
        }),
      );
    });
    expect(await getBaseChartLabelFormatterSample(previewChart, { value: 12500 })).toBe('12.5K');

    await page.goto('/');
    const chart = await getViewerSurface(page, 'chart-region-sales');
    await expect(chart).toHaveAttribute('data-ss-chart-test-hook', 'ready');
    await page.evaluate(() => {
      const debugWindow = window as Window & {
        __SUPERSUBSET_CHART_TEST_CLICKS__?: Array<Record<string, unknown>>;
        __SUPERSUBSET_WIDGET_EVENTS__?: Array<Record<string, unknown>>;
      };
      debugWindow.__SUPERSUBSET_CHART_TEST_CLICKS__ = [];
      debugWindow.__SUPERSUBSET_WIDGET_EVENTS__ = [];
    });

    await chart.evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent('ss-chart-test-click', {
          bubbles: true,
          detail: { seriesIndex: 0, dataIndex: 0 },
        }),
      );
    });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const debugWindow = window as Window & {
            __SUPERSUBSET_CHART_TEST_CLICKS__?: Array<Record<string, unknown>>;
          };
          return debugWindow.__SUPERSUBSET_CHART_TEST_CLICKS__?.length ?? 0;
        }),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const debugWindow = window as Window & {
            __SUPERSUBSET_WIDGET_EVENTS__?: Array<Record<string, unknown>>;
          };
          return debugWindow.__SUPERSUBSET_WIDGET_EVENTS__?.length ?? 0;
        }),
      )
      .toBeGreaterThan(0);
    const lastEvent = await page.evaluate(() => {
      const debugWindow = window as Window & {
        __SUPERSUBSET_WIDGET_EVENTS__?: Array<Record<string, unknown>>;
      };
      const events = debugWindow.__SUPERSUBSET_WIDGET_EVENTS__ ?? [];
      return events[events.length - 1];
    });

    expect(lastEvent?.widgetId).toBe('chart-region-sales');
    expect(lastEvent?.type).toBe('click');
    expect(lastEvent?.payload).toEqual(
      expect.objectContaining({
        region: expect.any(String),
        revenue: expect.any(Number),
      }),
    );
  });

  test('line chart designer controls change shape and marker behavior', async ({ page }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'chart-revenue-trend');
    await setRadioField(page, 'chart-revenue-trend', 'showMarkers', 'No');
    await setSelectField(page, 'chart-revenue-trend', 'step', 'end');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-revenue-trend'),
      (option) => {
        const series = getSeriesList(option);

        expect(series[0]).toEqual(
          expect.objectContaining({
            type: 'line',
            step: 'end',
            showSymbol: false,
          }),
        );
      },
    );
  });

  test('line chart viewer preserves axis titles and rotated labels from designer controls', async ({
    page,
  }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'chart-revenue-trend');
    await setTextField(page, 'chart-revenue-trend', 'xAxisTitle', 'Sales Month');
    await setTextField(page, 'chart-revenue-trend', 'yAxisTitle', 'Revenue (USD)');
    await setSelectField(page, 'chart-revenue-trend', 'xAxisLabelRotate', '45');
    await setNumberField(page, 'chart-revenue-trend', 'yAxisMin', 0);
    await setNumberField(page, 'chart-revenue-trend', 'yAxisMax', 25000);

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-revenue-trend'), (option) => {
      const xAxis = getAxisOption(option, 'xAxis');
      const yAxis = getAxisOption(option, 'yAxis');

      expect(xAxis).toEqual(
        expect.objectContaining({
          name: 'Sales Month',
          axisLabel: expect.any(Object),
        }),
      );
      expect(asNumberLike(asRecord(xAxis?.axisLabel)?.rotate)).toBe(45);

      expect(yAxis).toEqual(expect.objectContaining({ name: 'Revenue (USD)' }));
      expect(asNumberLike(yAxis?.min)).toBe(0);
      expect(asNumberLike(yAxis?.max)).toBe(25000);
    });
  });

  test('bar chart designer controls change geometry', async ({ page }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'chart-region-sales');
    await setRadioField(page, 'chart-region-sales', 'orientation', 'Vertical');
    await setSelectField(page, 'chart-region-sales', 'barWidth', '60%');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-region-sales'),
      (option) => {
        expect(getAxisOption(option, 'xAxis')).toEqual(
          expect.objectContaining({ type: 'category' }),
        );
        expect(getAxisOption(option, 'yAxis')).toEqual(expect.objectContaining({ type: 'value' }));
        expect(getSeriesList(option)[0]).toEqual(
          expect.objectContaining({
            type: 'bar',
            barWidth: '60%',
          }),
        );
      },
    );
  });

  test('horizontal bar chart viewer shows a vertical zoom rail when zoomable', async ({ page }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'chart-region-sales');
    await setRadioField(page, 'chart-region-sales', 'zoomable', 'Yes');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-region-sales'), (option) => {
      expect(getAxisOption(option, 'xAxis')).toEqual(expect.objectContaining({ type: 'value' }));
      expect(getAxisOption(option, 'yAxis')).toEqual(expect.objectContaining({ type: 'category' }));
      expect(getDataZoomOptions(option)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'slider',
            yAxisIndex: 0,
            orient: 'vertical',
          }),
        ]),
      );
    });
  });

  test('pie chart designer controls change donut layout', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-pie');
    await setSelectField(page, 'chart-pie', 'variant', 'donut');
    await setSelectField(page, 'chart-pie', 'labelPosition', 'inside');
    await setNumberField(page, 'chart-pie', 'innerRadius', 45);

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-pie'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'pie',
          radius: ['45%', '70%'],
          label: expect.objectContaining({
            show: true,
            position: 'inside',
          }),
        }),
      );
    });
  });

  test('pie chart viewer preserves donut layout after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-pie');
    await setSelectField(page, 'chart-pie', 'variant', 'donut');
    await setSelectField(page, 'chart-pie', 'labelPosition', 'inside');
    await setNumberField(page, 'chart-pie', 'innerRadius', 45);

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-pie'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'pie',
          radius: ['45%', '70%'],
          label: expect.objectContaining({
            show: true,
            position: 'inside',
          }),
        }),
      );
    });
  });

  test('scatter chart designer controls change mark sizing', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-scatter');
    await setFieldRefField(page, 'Size Field', '');
    await setNumberField(page, 'chart-scatter', 'symbolSize', 24);
    await setSelectField(page, 'chart-scatter', 'opacity', '0.4');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-scatter'),
      (option) => {
        const series = getSeriesList(option)[0];

        expect(series).toEqual(
          expect.objectContaining({
            type: 'scatter',
            symbolSize: 24,
            itemStyle: expect.any(Object),
          }),
        );
        expect(asNumberLike(asRecord(series?.itemStyle)?.opacity)).toBeCloseTo(0.4, 5);
      },
    );
  });

  test('scatter chart viewer preserves mark sizing after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-scatter');
    await setFieldRefField(page, 'Size Field', '');
    await setNumberField(page, 'chart-scatter', 'symbolSize', 24);
    await setSelectField(page, 'chart-scatter', 'opacity', '0.4');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-scatter'), (option) => {
      const series = getSeriesList(option)[0];

      expect(series).toEqual(
        expect.objectContaining({
          type: 'scatter',
          symbolSize: 24,
          itemStyle: expect.any(Object),
        }),
      );
      expect(asNumberLike(asRecord(series?.itemStyle)?.opacity)).toBeCloseTo(0.4, 5);
    });
  });

  test('area chart designer controls change fill treatment', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-area');
    await setRadioField(page, 'chart-area', 'stacked', 'Yes');
    await setSelectField(page, 'chart-area', 'areaOpacity', '0.3');
    await setRadioField(page, 'chart-area', 'showMarkers', 'No');

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-area'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'line',
          stack: 'total',
          showSymbol: false,
          areaStyle: expect.objectContaining({ opacity: 0.3 }),
        }),
      );
    });
  });

  test('area chart viewer preserves fill treatment after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-area');
    await setRadioField(page, 'chart-area', 'stacked', 'Yes');
    await setSelectField(page, 'chart-area', 'areaOpacity', '0.3');
    await setRadioField(page, 'chart-area', 'showMarkers', 'No');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-area'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'line',
          stack: 'total',
          showSymbol: false,
          areaStyle: expect.objectContaining({ opacity: 0.3 }),
        }),
      );
    });
  });

  test('combo chart designer controls keep both series families rendering', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-combo');
    await setRadioField(page, 'chart-combo', 'lineSmooth', 'No');
    await setNumberField(page, 'chart-combo', 'barBorderRadius', 14);

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-combo'), (option) => {
      const series = getSeriesList(option);
      const barSeries = series.find((candidate) => candidate.type === 'bar');
      const lineSeries = series.find((candidate) => candidate.type === 'line');

      expect(barSeries).toEqual(
        expect.objectContaining({
          itemStyle: expect.objectContaining({ borderRadius: 14 }),
        }),
      );
      expect(lineSeries).toEqual(
        expect.objectContaining({
          smooth: false,
        }),
      );
    });
  });

  test('combo chart viewer preserves mixed bar and line series after designer edits', async ({
    page,
  }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-combo');
    await setRadioField(page, 'chart-combo', 'lineSmooth', 'No');
    await setNumberField(page, 'chart-combo', 'barBorderRadius', 14);

    await switchToViewer(page);

    const comboChart = await getViewerSurface(page, 'chart-combo');

    await expect(page.getByText('Unknown: markdown')).toHaveCount(0);
    await expect(page.getByText(/all 17 widget types/i)).toBeVisible();

    await expectBaseChartOption(comboChart, (option) => {
      const series = getSeriesList(option);
      const barSeries = series.find((candidate) => candidate.type === 'bar');
      const lineSeries = series.find((candidate) => candidate.type === 'line');

      expect(barSeries).toEqual(
        expect.objectContaining({
          itemStyle: expect.objectContaining({ borderRadius: 14 }),
        }),
      );
      expect(lineSeries).toEqual(
        expect.objectContaining({
          smooth: false,
        }),
      );
    });
  });

  test('heatmap chart designer controls change cell outlines', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-heatmap');
    await setNumberField(page, 'chart-heatmap', 'cellBorderWidth', 4);
    await setSelectField(page, 'chart-heatmap', 'cellBorderColor', '#757575');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-heatmap'),
      (option) => {
        expect(getSeriesList(option)[0]).toEqual(
          expect.objectContaining({
            type: 'heatmap',
            itemStyle: expect.objectContaining({
              borderWidth: 4,
              borderColor: '#757575',
            }),
          }),
        );
      },
    );
  });

  test('heatmap chart viewer preserves cell outlines after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-heatmap');
    await setNumberField(page, 'chart-heatmap', 'cellBorderWidth', 4);
    await setSelectField(page, 'chart-heatmap', 'cellBorderColor', '#757575');

    await switchToViewer(page);

    const heatmapChart = await getViewerSurface(page, 'chart-heatmap');
    const heatmapOption = await getBaseChartOption(heatmapChart);
    const heatmapSeries = Array.isArray(heatmapOption?.series)
      ? heatmapOption.series[0]
      : undefined;

    expect(heatmapSeries).toEqual(
      expect.objectContaining({
        type: 'heatmap',
        itemStyle: expect.objectContaining({
          borderWidth: 4,
          borderColor: '#757575',
        }),
      }),
    );
  });

  test('radar chart designer controls change shape and fill', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-radar');
    await setRadioField(page, 'chart-radar', 'shape', 'Circle');
    await setRadioField(page, 'chart-radar', 'areaFill', 'No');

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-radar'), (option) => {
      const series = getSeriesList(option);
      const firstDatum =
        Array.isArray(series[0]?.data) && isRecord(series[0].data[0])
          ? series[0].data[0]
          : undefined;

      expect(asRecord(option.radar)).toEqual(expect.objectContaining({ shape: 'circle' }));
      expect(firstDatum).toBeDefined();
      expect(firstDatum).not.toHaveProperty('areaStyle');
    });
  });

  test('radar chart viewer preserves shape and fill after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-radar');
    await setRadioField(page, 'chart-radar', 'shape', 'Circle');
    await setRadioField(page, 'chart-radar', 'areaFill', 'No');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-radar'), (option) => {
      const series = getSeriesList(option);
      const firstDatum =
        Array.isArray(series[0]?.data) && isRecord(series[0].data[0])
          ? series[0].data[0]
          : undefined;

      expect(asRecord(option.radar)).toEqual(expect.objectContaining({ shape: 'circle' }));
      expect(firstDatum).toBeDefined();
      expect(firstDatum).not.toHaveProperty('areaStyle');
    });
  });

  test('funnel chart designer controls change layout spacing', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-funnel');
    await setNumberField(page, 'chart-funnel', 'gap', 12);
    await setSelectField(page, 'chart-funnel', 'labelPosition', 'outside');

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-funnel'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'funnel',
          gap: 12,
          label: expect.objectContaining({ position: 'outside' }),
        }),
      );
    });
  });

  test('funnel chart viewer preserves layout spacing after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-funnel');
    await setNumberField(page, 'chart-funnel', 'gap', 12);
    await setSelectField(page, 'chart-funnel', 'labelPosition', 'outside');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-funnel'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'funnel',
          gap: 12,
          label: expect.objectContaining({ position: 'outside' }),
        }),
      );
    });
  });

  test('treemap chart designer controls change visible hierarchy treatment', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-treemap');
    await setRadioField(page, 'chart-treemap', 'showUpperLabel', 'Yes');
    await setNumberField(page, 'chart-treemap', 'borderWidth', 4);

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-treemap'),
      (option) => {
        expect(getSeriesList(option)[0]).toEqual(
          expect.objectContaining({
            type: 'treemap',
            upperLabel: expect.objectContaining({ show: true }),
            itemStyle: expect.objectContaining({ borderWidth: 4 }),
          }),
        );
      },
    );
  });

  test('treemap chart viewer preserves visible hierarchy treatment after designer edits', async ({
    page,
  }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-treemap');
    await setRadioField(page, 'chart-treemap', 'showUpperLabel', 'Yes');
    await setNumberField(page, 'chart-treemap', 'borderWidth', 4);

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-treemap'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'treemap',
          upperLabel: expect.objectContaining({ show: true }),
          itemStyle: expect.objectContaining({ borderWidth: 4 }),
        }),
      );
    });
  });

  test('sankey chart designer controls change node and link layout', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-sankey');
    await setRadioField(page, 'chart-sankey', 'orient', 'Vertical');
    await setNumberField(page, 'chart-sankey', 'nodeGap', 24);

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-sankey'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'sankey',
          orient: 'vertical',
          nodeGap: 24,
        }),
      );
    });
  });

  test('sankey chart viewer preserves vertical link layout after designer edits', async ({
    page,
  }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-sankey');
    await setRadioField(page, 'chart-sankey', 'orient', 'Vertical');
    await setNumberField(page, 'chart-sankey', 'nodeGap', 24);

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-sankey'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'sankey',
          orient: 'vertical',
          nodeGap: 24,
        }),
      );
    });
  });

  test('waterfall chart designer controls change colors and total labeling', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-waterfall');
    await setTextField(page, 'chart-waterfall', 'totalLabel', 'Net Profit');
    await setSelectField(page, 'chart-waterfall', 'increaseColor', '#13c2c2');
    await setSelectField(page, 'chart-waterfall', 'decreaseColor', '#fa8c16');
    await setSelectField(page, 'chart-waterfall', 'totalColor', '#722ed1');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-waterfall'),
      (option) => {
        const series = getSeriesList(option);
        const categories = getAxisOption(option, 'xAxis');
        const totalIndex = Array.isArray(categories?.data)
          ? categories.data.findIndex((value) => value === 'Net Profit')
          : -1;
        const totalPoint =
          totalIndex >= 0 && Array.isArray(series[1]?.data) && isRecord(series[1].data[totalIndex])
            ? series[1].data[totalIndex]
            : undefined;

        expect(series[1]).toEqual(
          expect.objectContaining({
            name: 'Increase',
            itemStyle: expect.objectContaining({ color: '#13c2c2' }),
          }),
        );
        expect(series[2]).toEqual(
          expect.objectContaining({
            name: 'Decrease',
            itemStyle: expect.objectContaining({ color: '#fa8c16' }),
          }),
        );
        expect(totalIndex).toBeGreaterThan(-1);
        expect(totalPoint).toEqual(
          expect.objectContaining({
            value: expect.any(Number),
            itemStyle: expect.objectContaining({ color: '#722ed1' }),
          }),
        );
      },
    );
  });

  test('waterfall chart viewer preserves colors and total labeling after designer edits', async ({
    page,
  }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-waterfall');
    await setTextField(page, 'chart-waterfall', 'totalLabel', 'Net Profit');
    await setSelectField(page, 'chart-waterfall', 'increaseColor', '#13c2c2');
    await setSelectField(page, 'chart-waterfall', 'decreaseColor', '#fa8c16');
    await setSelectField(page, 'chart-waterfall', 'totalColor', '#722ed1');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-waterfall'), (option) => {
      const series = getSeriesList(option);
      const categories = getAxisOption(option, 'xAxis');
      const totalIndex = Array.isArray(categories?.data)
        ? categories.data.findIndex((value) => value === 'Net Profit')
        : -1;
      const totalPoint =
        totalIndex >= 0 && Array.isArray(series[1]?.data) && isRecord(series[1].data[totalIndex])
          ? series[1].data[totalIndex]
          : undefined;

      expect(series[1]).toEqual(
        expect.objectContaining({
          name: 'Increase',
          itemStyle: expect.objectContaining({ color: '#13c2c2' }),
        }),
      );
      expect(series[2]).toEqual(
        expect.objectContaining({
          name: 'Decrease',
          itemStyle: expect.objectContaining({ color: '#fa8c16' }),
        }),
      );
      expect(totalIndex).toBeGreaterThan(-1);
      expect(totalPoint).toEqual(
        expect.objectContaining({
          value: expect.any(Number),
          itemStyle: expect.objectContaining({ color: '#722ed1' }),
        }),
      );
    });
  });

  test('box plot designer controls change box geometry', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-boxplot');
    await setSelectField(page, 'chart-boxplot', 'boxWidth', '50');

    await expectBaseChartOption(
      await getDesignerPreviewSurface(page, 'chart-boxplot'),
      (option) => {
        const series = getSeriesList(option)[0];
        const boxWidth = Array.isArray(series?.boxWidth) ? series.boxWidth : [];

        expect(series).toEqual(expect.objectContaining({ type: 'boxplot' }));
        expect(asNumberLike(boxWidth[0])).toBe(50);
        expect(asNumberLike(boxWidth[1])).toBe(50);
      },
    );
  });

  test('box plot viewer preserves box geometry after designer edits', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-boxplot');
    await setSelectField(page, 'chart-boxplot', 'boxWidth', '50');

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-boxplot'), (option) => {
      const series = getSeriesList(option)[0];
      const boxWidth = Array.isArray(series?.boxWidth) ? series.boxWidth : [];

      expect(series).toEqual(expect.objectContaining({ type: 'boxplot' }));
      expect(asNumberLike(boxWidth[0])).toBe(50);
      expect(asNumberLike(boxWidth[1])).toBe(50);
    });
  });

  test('gauge chart designer controls change arc geometry', async ({ page }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-gauge');
    await setRadioField(page, 'chart-gauge', 'roundCap', 'Yes');
    await setRadioField(page, 'chart-gauge', 'progressMode', 'Yes');
    await setNumberField(page, 'chart-gauge', 'startAngle', 180);
    await setNumberField(page, 'chart-gauge', 'endAngle', 0);

    await expectBaseChartOption(await getDesignerPreviewSurface(page, 'chart-gauge'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'gauge',
          roundCap: true,
          startAngle: 180,
          endAngle: 0,
          progress: expect.objectContaining({
            show: true,
            roundCap: true,
          }),
        }),
      );
    });
  });

  test('gauge chart viewer preserves semicircle progress geometry after designer edits', async ({
    page,
  }) => {
    await openDesigner(page);
    await openDesignerPage(page, 'page-gallery');
    await selectDesignerWidget(page, 'chart-gauge');
    await setRadioField(page, 'chart-gauge', 'roundCap', 'Yes');
    await setRadioField(page, 'chart-gauge', 'progressMode', 'Yes');
    await setNumberField(page, 'chart-gauge', 'startAngle', 180);
    await setNumberField(page, 'chart-gauge', 'endAngle', 0);

    await switchToViewer(page);

    await expectBaseChartOption(await getViewerSurface(page, 'chart-gauge'), (option) => {
      expect(getSeriesList(option)[0]).toEqual(
        expect.objectContaining({
          type: 'gauge',
          roundCap: true,
          startAngle: 180,
          endAngle: 0,
          progress: expect.objectContaining({
            show: true,
            roundCap: true,
          }),
        }),
      );
    });
  });

  test('table designer controls change totals and alignment', async ({ page }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'table-orders');
    await setRadioField(page, 'table-orders', 'showTotals', 'Yes');
    await setSelectField(page, 'table-orders', 'headerAlign', 'center');
    await setSelectField(page, 'table-orders', 'cellAlign', 'right');

    const table = await getDesignerPreviewSurface(page, 'table-orders', '.ss-table');
    const headerCell = table.locator('th').first();
    const firstValueCell = table.locator('tbody tr').nth(0).locator('td').nth(2);
    const totalsRow = table.locator('tbody tr').last();

    await expect(table).toContainText('16,255');
    await expect(headerCell).toHaveCSS('text-align', 'center');
    await expect(firstValueCell).toHaveCSS('text-align', 'right');
    await expect(totalsRow).toContainText('16,255');
  });

  test('table designer controls change row numbering, page size, and striping in viewer', async ({
    page,
  }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'table-orders');
    await setNumberField(page, 'table-orders', 'pageSize', 2);
    await setRadioField(page, 'table-orders', 'showRowNumbers', 'Yes');
    await setRadioField(page, 'table-orders', 'striped', 'No');

    await switchToViewer(page);

    const table = page.locator('.ss-table').first();
    const headerCells = table.locator('th');
    const bodyRows = table.locator('tbody tr');
    const firstRowNumberCell = bodyRows.first().locator('td').first();
    const secondRow = bodyRows.nth(1);

    await expect(table).toBeVisible();
    await expect(headerCells.first()).toHaveText('#');
    await expect(bodyRows).toHaveCount(2);
    await expect(firstRowNumberCell).toHaveText('1');
    await expect(secondRow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });

  test('kpi card designer controls change rendered text treatment', async ({ page }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'kpi-revenue');
    await setTextField(page, 'kpi-revenue', 'prefix', 'ARR: ');
    await setRadioField(page, 'kpi-revenue', 'trendDirection', 'Down = Good');

    const kpi = await getDesignerPreviewSurface(page, 'kpi-revenue', '.ss-kpi');

    await expect(kpi).toContainText('ARR:');
    await expect(kpi).toContainText('(↓ is good)');
  });

  test('kpi designer controls change suffix, value sizing, and comparison rendering in viewer', async ({
    page,
  }) => {
    await openDesigner(page);
    await selectDesignerWidget(page, 'kpi-revenue');
    await setTextField(page, 'kpi-revenue', 'suffix', ' net');
    await setSelectField(page, 'kpi-revenue', 'fontSize', 'lg');
    await setFieldRefField(page, 'Comparison Field', '');

    await switchToViewer(page);

    const kpi = page.locator('.ss-kpi').filter({ hasText: 'Total Revenue' });
    const value = kpi.locator('div').filter({ hasText: '$23.0K net' }).first();

    await expect(kpi).toBeVisible();
    await expect(kpi).toContainText('$23.0K net');
    await expect(kpi).not.toContainText('▲');
    await expect(value).toHaveCSS('font-size', '48px');
  });
});

async function openDesigner(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /designer/i }).click();
  await expect(page.getByTestId('designer-header-controls').last()).toBeVisible({ timeout: 10000 });
  await page.locator('nav').evaluate((nav) => {
    const item = Array.from(nav.querySelectorAll('li')).find(
      (candidate) => candidate.textContent?.trim() === 'Fields',
    );

    if (!(item instanceof HTMLElement)) {
      throw new Error('Could not find the Fields nav item in the designer shell');
    }

    const clickTarget = item.querySelector('div');
    (clickTarget instanceof HTMLElement ? clickTarget : item).click();
  });
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function openDesignerPage(page: Page, pageId: DesignerPageId) {
  const tab = page.getByTestId(`designer-page-tab-${pageId}`);
  await tab.click();
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function selectDesignerWidget(page: Page, widgetId: string) {
  const component = previewFrame(page).locator(`[data-puck-component="${widgetId}"]`).last();
  await expect(component).toBeVisible();
  await component.click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(250);
}

async function switchToViewer(page: Page) {
  await page.getByRole('button', { name: /viewer/i }).click();
  await expect(page.locator('[data-ss-dashboard="demo-sales"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function getViewerSurface(page: Page, widgetId: string) {
  const surface = viewerSurfaces[widgetId];
  if (!surface) {
    throw new Error(`No viewer surface mapping found for ${widgetId}`);
  }

  if (surface.pageButton) {
    await page.getByRole('button', { name: surface.pageButton }).click();
    await page.waitForTimeout(RENDER_WAIT_MS);
  }

  const candidateLocators = [
    page.locator(
      `[data-ss-dashboard="demo-sales"] [data-ss-node="${surface.nodeId}"] ${surface.selector}`,
    ),
    page.locator(
      `[data-ss-dashboard="demo-sales"] [data-ss-node="layout-${widgetId}"] ${surface.selector}`,
    ),
  ];

  for (const locator of candidateLocators) {
    if ((await locator.count()) > 0) {
      const target = locator.first();
      await target.scrollIntoViewIfNeeded();
      await expect(target).toBeVisible();
      await page.waitForTimeout(RENDER_WAIT_MS);
      return target;
    }
  }

  await expect(candidateLocators[0].first()).toBeVisible();
  return candidateLocators[0].first();
}

async function getBaseChartOption(locator: Locator): Promise<Record<string, unknown> | null> {
  return locator.evaluate((element) => {
    const fiberKey = Object.getOwnPropertyNames(element).find((key) =>
      key.startsWith('__reactFiber$'),
    );
    let current = fiberKey ? (element as Record<string, unknown>)[fiberKey] : undefined;

    while (current && typeof current === 'object') {
      const record = current as {
        memoizedProps?: { option?: unknown };
        return?: unknown;
      };

      if (record.memoizedProps?.option !== undefined) {
        return JSON.parse(JSON.stringify(record.memoizedProps.option)) as Record<string, unknown>;
      }

      current = record.return;
    }

    return null;
  });
}

async function expectBaseChartOption(
  locator: Locator,
  assertion: (option: Record<string, unknown>) => void | Promise<void>,
) {
  await expect
    .poll(
      async () => {
        const option = await getBaseChartOption(locator);

        if (!option) {
          return 'BaseChart option was not found on the selected surface';
        }

        try {
          await assertion(option);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
      {
        message: 'Expected chart option assertion to pass after preview/runtime updates settled',
        timeout: 5000,
      },
    )
    .toBeNull();
}

async function getBaseChartLabelFormatterSample(
  locator: Locator,
  sample: Record<string, unknown>,
): Promise<string | null> {
  return locator.evaluate((element, formatterInput) => {
    const fiberKey = Object.getOwnPropertyNames(element).find((key) =>
      key.startsWith('__reactFiber$'),
    );
    let current = fiberKey ? (element as Record<string, unknown>)[fiberKey] : undefined;

    while (current && typeof current === 'object') {
      const record = current as {
        memoizedProps?: { option?: unknown };
        return?: unknown;
      };

      if (record.memoizedProps?.option !== undefined) {
        const option = record.memoizedProps.option as Record<string, unknown>;
        const rawSeries = Array.isArray(option.series) ? option.series : [option.series];
        const firstSeries = rawSeries.find(isRecord);
        const formatter = asRecord(asRecord(firstSeries)?.label)?.formatter;

        return typeof formatter === 'function' ? String(formatter(formatterInput)) : null;
      }

      current = record.return;
    }

    return null;
  }, sample);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asNumberLike(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getSeriesList(option: Record<string, unknown>): Record<string, unknown>[] {
  const series = option.series;
  if (Array.isArray(series)) {
    return series.filter(isRecord);
  }

  return isRecord(series) ? [series] : [];
}

function getLegendOption(option: Record<string, unknown>) {
  return asRecord(option.legend);
}

function getAxisOption(option: Record<string, unknown>, axis: 'xAxis' | 'yAxis', index = 0) {
  const value = option[axis];
  if (Array.isArray(value)) {
    return asRecord(value[index]);
  }

  return index === 0 ? asRecord(value) : undefined;
}

function getDataZoomOptions(option: Record<string, unknown>): Record<string, unknown>[] {
  const value = option.dataZoom;
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

async function getDesignerPreviewSurface(page: Page, widgetId: string, selector = '.ss-chart') {
  const locator = previewFrame(page)
    .locator(`[data-puck-component="${widgetId}"] ${selector}`)
    .last();
  await expect(locator).toBeVisible();
  await page.waitForTimeout(RENDER_WAIT_MS);
  return locator;
}

async function getVisibleField(locator: Locator) {
  const matches = await locator.evaluateAll((elements) =>
    elements.map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        index,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden',
      };
    }),
  );

  const match = matches.find((candidate) => candidate.visible) ?? matches.at(-1);
  if (!match) {
    throw new Error('Expected to find at least one matching field control');
  }

  return locator.nth(match.index);
}

async function setTextField(page: Page, widgetId: string, field: string, value: string) {
  const input = await getVisibleField(page.locator(`#${widgetId}_text_${field}`));
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.blur();
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function setNumberField(page: Page, widgetId: string, field: string, value: number) {
  const input = await getVisibleField(page.locator(`#${widgetId}_number_${field}`));
  await expect(input).toBeVisible();
  await input.fill(String(value));
  await input.blur();
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function setSelectField(page: Page, widgetId: string, field: string, value: string) {
  const select = await getVisibleField(page.locator(`#${widgetId}_select_${field}`));
  await expect(select).toBeVisible();

  const normalized = value.trim().toLowerCase();
  const options = await select.locator('option').evaluateAll((elements) =>
    elements.map((element) => ({
      value: element.getAttribute('value') ?? '',
      label: (element.textContent ?? '').trim(),
    })),
  );

  const match = options.find((option) => {
    const optionValue = option.value.trim().toLowerCase();
    const optionLabel = option.label.trim().toLowerCase();
    return (
      optionValue === normalized ||
      optionLabel === normalized ||
      optionValue.includes(`"${normalized}"`) ||
      optionValue.includes(normalized)
    );
  });

  if (!match) {
    throw new Error(
      `Could not find option "${value}" for ${widgetId}.${field}. Available options: ${options
        .map((option) => `${option.label || '<empty>'}=${option.value || '<empty>'}`)
        .join(', ')}`,
    );
  }

  await select.selectOption(match.value);
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function setFieldRefField(page: Page, label: string, value: string) {
  const select = await getVisibleField(page.getByLabel(label));
  await expect(select).toBeVisible();
  await select.selectOption(value);
  await page.waitForTimeout(RENDER_WAIT_MS);
}

async function setRadioField(page: Page, widgetId: string, field: string, label: string) {
  const radio = await getVisibleField(
    page.locator(`#${widgetId}_radio_${field} label`).filter({ hasText: label }),
  );
  await expect(radio).toBeVisible();
  await radio.click();
  await page.waitForTimeout(RENDER_WAIT_MS);
}

function previewFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe').first();
}
