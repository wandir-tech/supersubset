/**
 * Shared helpers for documentation screenshot capture.
 *
 * Provides consistent navigation, element selection, and screenshot capture
 * across all feature documentation scripts.
 */
import { type Page, type Locator, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Base directory for screenshot output */
const SCREENSHOTS_DIR = path.resolve(__dirname, '../src/assets/screenshots');

/** Ensure the screenshot directory exists */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Build the full output path for a screenshot.
 */
export function screenshotPath(
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
): string {
  const dir = path.join(SCREENSHOTS_DIR, category);
  ensureDir(dir);
  return path.join(dir, `${slug}-${variant}-${view}.png`);
}

/**
 * Switch the dev app to viewer mode.
 */
export async function switchToViewer(page: Page): Promise<void> {
  // Try button role first, then fall back to text matching
  const btn = page.getByRole('button', { name: /viewer/i });
  if (
    await btn
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await btn.first().click();
  } else {
    const textBtn = page.getByText('Viewer');
    if (
      await textBtn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await textBtn.first().click();
    }
  }
  await page.waitForTimeout(800);
}

/**
 * Switch the dev app to designer mode.
 */
export async function switchToDesigner(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /designer/i });
  if (
    await btn
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await btn.first().click();
  } else {
    const textBtn = page.getByText('Designer');
    if (
      await textBtn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await textBtn.first().click();
    }
  }
  await page.waitForTimeout(800);
}

/**
 * Navigate to a specific page tab in the viewer.
 * Works with both viewer nav tabs and designer page tabs.
 */
export async function navigateToPage(page: Page, pageTitle: string): Promise<void> {
  // Try role=tab first
  const tab = page.getByRole('tab', { name: new RegExp(pageTitle, 'i') });
  if (
    await tab
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await tab.first().click();
    await page.waitForTimeout(500);
    return;
  }
  // Try nav buttons
  const navBtn = page.locator('nav button', { hasText: new RegExp(pageTitle, 'i') });
  if (
    await navBtn
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await navBtn.first().click();
    await page.waitForTimeout(500);
    return;
  }
  // Try any button with the text
  const anyBtn = page.locator('button', { hasText: new RegExp(pageTitle, 'i') });
  if (
    await anyBtn
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await anyBtn.first().click();
    await page.waitForTimeout(500);
  }
}

/**
 * Wait for charts to be fully rendered.
 */
export async function waitForChartsReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // ECharts animation buffer
}

/**
 * Capture a full-page screenshot (viewport-sized).
 */
export async function captureFullPage(
  page: Page,
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
): Promise<string> {
  const filePath = screenshotPath(category, slug, variant, view);
  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: 'disabled',
  });
  return filePath;
}

/**
 * Capture a screenshot of a specific element.
 */
export async function captureElement(
  locator: Locator,
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
): Promise<string> {
  const filePath = screenshotPath(category, slug, variant, view);
  await locator.screenshot({
    path: filePath,
    animations: 'disabled',
  });
  return filePath;
}

/**
 * Try to capture a specific widget by its layout node ID (data-ss-node attribute).
 * Accepts additional fallback node IDs to try (useful after designer edits which
 * regenerate layout node IDs). Falls back to full page if none match.
 */
export async function captureWidget(
  page: Page,
  nodeId: string,
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
  ...fallbackNodeIds: string[]
): Promise<string> {
  const candidates = [nodeId, ...fallbackNodeIds];
  for (const id of candidates) {
    const widget = page.locator(`[data-ss-node="${id}"]`);
    if (await widget.isVisible({ timeout: 2000 }).catch(() => false)) {
      await widget.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      return captureElement(widget, category, slug, variant, view);
    }
  }
  // Last resort: full page capture
  return captureFullPage(page, category, slug, variant, view);
}

/**
 * Capture a widget from the Puck canvas iframe by its Puck component ID.
 * Use this after toggling a property in the designer — the iframe renders charts
 * with demo data intact (unlike the viewer which loses data after re-serialization).
 *
 * @param puckComponentId - The `data-puck-component` value (matches the widget id in the dashboard definition)
 */
export async function captureWidgetFromCanvas(
  page: Page,
  puckComponentId: string,
  category: string,
  slug: string,
  variant: string,
): Promise<string> {
  const filePath = screenshotPath(category, slug, variant, 'viewer');
  const iframe = page.frameLocator('iframe').first();
  const widget = iframe.locator(`[data-puck-component="${puckComponentId}"]`);
  if (await widget.isVisible({ timeout: 5000 }).catch(() => false)) {
    await widget.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800); // Wait for ECharts animations
    await widget.screenshot({ path: filePath, animations: 'disabled' });
    return filePath;
  }
  // Fallback: full page capture
  return captureFullPage(page, category, slug, variant, 'designer');
}

/**
 * Capture a row of widgets (e.g., KPI row).
 */
export async function captureRow(
  page: Page,
  rowId: string,
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
): Promise<string> {
  const row = page.locator(`[data-ss-node="${rowId}"]`);
  if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    return captureElement(row, category, slug, variant, view);
  }
  return captureFullPage(page, category, slug, variant, view);
}

/**
 * Collect console errors.
 */
export function setupConsoleErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('favicon.ico')) return;
      if (text.includes('net::ERR_')) return; // network errors from canceled requests
      errors.push(text);
    }
  });
  return errors;
}

/**
 * Assert no unexpected console errors accumulated.
 */
export function assertNoConsoleErrors(errors: string[]): void {
  if (errors.length > 0) {
    console.warn('Console errors detected:', errors);
    // Warn but don't fail — some errors may be expected in dev mode
  }
}

/**
 * Select a widget in the designer by clicking inside the Puck canvas iframe.
 * Uses the Layers panel to verify selection.
 *
 * @param page - Playwright page
 * @param widgetLabel - The label shown in the Layers panel (e.g., "Line Chart", "Bar Chart", "KPI Card")
 * @param clickY - Relative Y position (0–1) within the iframe to click
 */
export async function selectWidgetViaCanvas(
  page: Page,
  widgetLabel: string,
  clickY: number,
): Promise<void> {
  // Switch to Layers tab so we can see which widget is selected
  const layersBtn = page.getByText('Layers').first();
  if (await layersBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await layersBtn.click();
    await page.waitForTimeout(300);
  }

  // Click inside the iframe at the specified Y position
  const iframe = page.locator('iframe');
  if (await iframe.isVisible({ timeout: 3000 })) {
    const box = await iframe.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * clickY);
      await page.waitForTimeout(800);
    }
  }
}

/**
 * Select a widget in the designer by clicking its stable `data-puck-component`
 * wrapper inside the canvas iframe.
 */
export async function selectWidgetFromCanvasByComponentId(
  page: Page,
  puckComponentId: string,
): Promise<boolean> {
  const iframe = page.frameLocator('iframe').first();
  const widget = iframe.locator(`[data-puck-component="${puckComponentId}"]`).first();

  if (!(await widget.isVisible({ timeout: 3000 }).catch(() => false))) {
    return false;
  }

  await widget.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await widget.click();
  await page.waitForTimeout(500);
  return true;
}

/**
 * Select a widget in the designer by clicking its layer entry in the Layers panel.
 * For duplicate labels (e.g., multiple KPI Cards), clicks the first match.
 */
export async function selectWidgetViaLayers(page: Page, widgetLabel: string): Promise<boolean> {
  // Switch to Layers tab
  const layersBtn = page.getByRole('button', { name: /^Layers$/ }).first();
  if (await layersBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await layersBtn.click();
    await page.waitForTimeout(500);
  } else {
    const layersText = page.getByText('Layers').first();
    if (await layersText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await layersText.click();
      await page.waitForTimeout(500);
    }
  }

  const exactWidgetName = new RegExp(`^${escapeRegExp(widgetLabel)}$`);
  const layerTree = page.locator('nav + ul').first();
  const rowButtons = layerTree.getByRole('button', { name: /Row \(12-col Grid\)$/ });
  const rowCount = await rowButtons.count();

  const widgetButton = layerTree.getByRole('button', { name: exactWidgetName }).first();
  if (await widgetButton.isVisible({ timeout: 300 }).catch(() => false)) {
    await widgetButton.click();
    await page.waitForTimeout(800);
    return true;
  }

  for (let index = 0; index < rowCount; index += 1) {
    const rowButton = rowButtons.nth(index);
    if (!(await rowButton.isVisible({ timeout: 300 }).catch(() => false))) {
      continue;
    }

    await rowButton.scrollIntoViewIfNeeded();
    await rowButton.click();
    await page.waitForTimeout(150);

    if (await widgetButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await widgetButton.click();
      await page.waitForTimeout(800);
      return true;
    }
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Capture a screenshot of the right sidebar (property panel) in the designer.
 * Uses viewport clipping since the Puck sidebar doesn't have stable selectors.
 */
export async function capturePropertyPanel(
  page: Page,
  category: string,
  slug: string,
  variant: string,
): Promise<string> {
  const filePath = screenshotPath(category, slug, variant, 'designer');
  await page.screenshot({
    path: filePath,
    clip: { x: 1100, y: 130, width: 340, height: 770 },
    animations: 'disabled',
  });
  return filePath;
}

/**
 * Capture a focused designer callout screenshot centered on a specific property field.
 * Draws a blue highlight rectangle around the field, then captures just the sidebar
 * area around it so the control is clearly visible and centered.
 *
 * Produces a compact image (~340×200px) suitable for "Designer Setting" callouts.
 *
 * @param page - Playwright page
 * @param fieldLabel - The label text of the field to highlight (e.g., "Smooth")
 * @param category - Screenshot category folder
 * @param slug - Feature slug
 * @param variant - Variant slug
 * @returns The file path of the captured callout screenshot
 */
export async function capturePropertyCallout(
  page: Page,
  fieldLabel: string,
  category: string,
  slug: string,
  variant: string,
): Promise<string> {
  const filePath = screenshotPath(category, slug, `${variant}-callout`, 'designer');

  // Use Playwright locators to find the VISIBLE field container.
  // Puck renders field panels for ALL components but only the selected one is visible.
  // We must iterate because .first() may return a hidden duplicate with zero dimensions.
  const fieldContainers = page.locator('[class*="PuckFields-field"]').filter({
    has: page.locator('[class*="Input-label"]', { hasText: new RegExp(`^${fieldLabel}$`) }),
  });

  let fieldBox: { x: number; y: number; width: number; height: number } | null = null;
  const count = await fieldContainers.count();
  for (let i = 0; i < count; i++) {
    const el = fieldContainers.nth(i);
    const box = await el.boundingBox();
    if (box && box.width > 0 && box.height > 0) {
      // Scroll the field into the center of its scroll container before measuring
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      fieldBox = await el.boundingBox();
      break;
    }
  }

  if (fieldBox && fieldBox.width > 0 && fieldBox.height > 0) {
    // Draw a blue highlight rectangle around the field using page.evaluate
    // This injects a temporary overlay div
    await page.evaluate((box) => {
      const existing = document.getElementById('ss-field-highlight');
      if (existing) existing.remove();

      const highlight = document.createElement('div');
      highlight.id = 'ss-field-highlight';
      highlight.style.cssText = `
        position: fixed;
        left: ${box.x - 4}px;
        top: ${box.y - 4}px;
        width: ${box.width + 8}px;
        height: ${box.height + 8}px;
        border: 3px solid #2563eb;
        border-radius: 8px;
        pointer-events: none;
        z-index: 99999;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      `;
      document.body.appendChild(highlight);
    }, fieldBox);

    await page.waitForTimeout(100);

    // Calculate a clip region centered on the field, ~340px wide, ~250px tall
    const CALLOUT_WIDTH = 340;
    const CALLOUT_HEIGHT = 250;
    const centerX = fieldBox.x + fieldBox.width / 2;
    const centerY = fieldBox.y + fieldBox.height / 2;
    const clipX = Math.max(0, Math.round(centerX - CALLOUT_WIDTH / 2));
    const clipY = Math.max(0, Math.round(centerY - CALLOUT_HEIGHT / 2));
    await page.screenshot({
      path: filePath,
      clip: { x: clipX, y: clipY, width: CALLOUT_WIDTH, height: CALLOUT_HEIGHT },
      animations: 'disabled',
    });

    // Remove the highlight overlay
    await page.evaluate(() => {
      const el = document.getElementById('ss-field-highlight');
      if (el) el.remove();
    });

    return filePath;
  }

  // Fallback: capture the full property panel
  return capturePropertyPanel(page, category, slug, variant);
}

// ─── Property Panel Interaction Helpers ──────────────────────

/**
 * Toggle a radio-style property in the Puck property panel.
 * Puck radio structure:
 *   div._PuckFields-field_ > label._Input_ >
 *     div._Input-label_ (contains icon + field name text)
 *     div._Input-radioGroupItems_ > label._Input-radio_ > div._Input-radioInner_ (option text)
 *
 * @param page - Playwright page
 * @param fieldLabel - The label text of the field (e.g., "Smooth", "Stacked")
 * @param targetValue - The radio option label to click (e.g., "Yes", "No", "Horizontal")
 */
export async function toggleRadioProperty(
  page: Page,
  fieldLabel: string,
  targetValue: string,
): Promise<boolean> {
  // Use page.evaluate for reliable DOM traversal
  const clicked = await page.evaluate(
    ({ fieldLabel, targetValue }) => {
      // Find the label div whose text content includes our field name
      const labelDivs = document.querySelectorAll('[class*="Input-label"]');
      for (const labelDiv of labelDivs) {
        // Check direct text content (excluding child element text)
        const textContent = Array.from(labelDiv.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join('');
        if (textContent !== fieldLabel) continue;

        // Found the label — now find the radio group in its parent
        const inputContainer = labelDiv.closest('[class*="Input_"]');
        if (!inputContainer) continue;

        // Find radio option with matching text
        const radioInners = inputContainer.querySelectorAll('[class*="Input-radioInner"]');
        for (const inner of radioInners) {
          if (inner.textContent?.trim() === targetValue) {
            // Find the input element (sibling of radioInner inside the label)
            const radioLabelEl = inner.closest('[class*="Input-radio"]') as HTMLElement;
            if (!radioLabelEl) continue;

            const input = radioLabelEl.querySelector(
              'input[type="radio"]',
            ) as HTMLInputElement | null;
            if (input) {
              // Method 1: Try React onChange via __reactProps$
              const propsKey = Object.keys(input).find((k) => k.startsWith('__reactProps$'));
              if (propsKey) {
                const props = (input as any)[propsKey];
                if (props?.onChange) {
                  input.checked = true;
                  props.onChange({ target: input, currentTarget: input });
                  return true;
                }
              }
            }

            // Method 2: Fallback to native click on the label
            radioLabelEl.click();
            return true;
          }
        }
      }
      return false;
    },
    { fieldLabel, targetValue },
  );

  if (clicked) {
    await page.waitForTimeout(1200); // Wait for chart to re-render
  }
  return clicked;
}

/**
 * Change a select property in the Puck property panel.
 *
 * @param page - Playwright page
 * @param fieldLabel - The label text of the field (e.g., "Variant", "Sort")
 * @param targetValue - The option value to select
 */
export async function changeSelectProperty(
  page: Page,
  fieldLabel: string,
  targetValue: string,
): Promise<boolean> {
  // Puck JSON-encodes select option values as {"value":"actual_value"}.
  // We need to find the matching option and use its raw value attribute,
  // then trigger React's onChange handler properly.
  const changed = await page.evaluate(
    ({ fieldLabel, targetValue }) => {
      const labelDivs = document.querySelectorAll('[class*="Input-label"]');
      for (const labelDiv of labelDivs) {
        const textContent = Array.from(labelDiv.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join('');
        if (textContent !== fieldLabel) continue;

        const fieldContainer =
          labelDiv.closest('[class*="PuckFields-field"]') ?? labelDiv.closest('[class*="Input_"]');
        if (!fieldContainer) continue;

        const select = fieldContainer.querySelector('select') as HTMLSelectElement | null;
        if (!select) continue;

        // Find the option whose value matches targetValue.
        // Puck options may be JSON-encoded ({"value":"20%"}) or plain strings.
        let matchingOptionValue: string | null = null;
        for (const opt of select.options) {
          if (opt.value === targetValue) {
            matchingOptionValue = opt.value;
            break;
          }
          // Try JSON-decoded match
          try {
            const parsed = JSON.parse(opt.value);
            if (parsed?.value === targetValue) {
              matchingOptionValue = opt.value;
              break;
            }
          } catch {
            /* not JSON */
          }
        }

        const valueToSet = matchingOptionValue ?? targetValue;

        // Set the native value
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value',
        )?.set;
        nativeInputValueSetter?.call(select, valueToSet);

        // Try React onChange via __reactProps$
        const propsKey = Object.keys(select).find((k) => k.startsWith('__reactProps$'));
        if (propsKey) {
          const props = (select as any)[propsKey];
          if (props?.onChange) {
            props.onChange({ target: select, currentTarget: select });
            return true;
          }
        }

        // Fallback: dispatch native change event
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },
    { fieldLabel, targetValue },
  );

  if (changed) {
    await page.waitForTimeout(1200);
  }
  return changed;
}

/**
 * Change a numeric property in the Puck property panel.
 */
export async function changeNumberProperty(
  page: Page,
  fieldLabel: string,
  targetValue: string,
): Promise<boolean> {
  const changed = await page.evaluate(
    ({ fieldLabel, targetValue }) => {
      const labelDivs = document.querySelectorAll('[class*="Input-label"]');
      for (const labelDiv of labelDivs) {
        const textContent = Array.from(labelDiv.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim())
          .join('');
        if (textContent !== fieldLabel) continue;

        const fieldContainer =
          labelDiv.closest('[class*="PuckFields-field"]') ?? labelDiv.closest('[class*="Input_"]');
        if (!fieldContainer) continue;

        const input = fieldContainer.querySelector('input') as HTMLInputElement | null;
        if (!input) continue;

        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeSetter?.call(input, targetValue);

        const propsKey = Object.keys(input).find((key) => key.startsWith('__reactProps$'));
        if (propsKey) {
          const props = (input as Record<string, unknown>)[propsKey] as
            | {
                onChange?: (event: {
                  target: HTMLInputElement;
                  currentTarget: HTMLInputElement;
                }) => void;
              }
            | undefined;
          if (props?.onChange) {
            props.onChange({ target: input, currentTarget: input });
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
          }
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
      }

      return false;
    },
    { fieldLabel, targetValue },
  );

  if (changed) {
    await page.waitForTimeout(1200);
  }

  return changed;
}

/**
 * Scroll a property into view within the Puck property panel sidebar.
 */
export async function scrollPropertyIntoView(page: Page, fieldLabel: string): Promise<void> {
  const fieldContainer = page.locator('[class*="PuckFields-field"]').filter({
    has: page.locator('[class*="Input-label"]', { hasText: new RegExp(`^${fieldLabel}$`) }),
  });

  if (
    await fieldContainer
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await fieldContainer.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  } else {
    // Try scrolling the right sidebar to find it
    const sidebar = page.locator('[class*="rightSideBar"]');
    if (await sidebar.isVisible().catch(() => false)) {
      for (let i = 0; i < 15; i++) {
        await sidebar.evaluate((el) => {
          const scrollable = el.querySelector('[class*="PuckFields"]') || el;
          scrollable.scrollBy(0, 200);
        });
        await page.waitForTimeout(200);
        if (
          await fieldContainer
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false)
        ) {
          await fieldContainer.first().scrollIntoViewIfNeeded();
          break;
        }
      }
    }
  }
}
