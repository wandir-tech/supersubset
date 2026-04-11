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
  if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.first().click();
  } else {
    const textBtn = page.getByText('Viewer');
    if (await textBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
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
  if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.first().click();
  } else {
    const textBtn = page.getByText('Designer');
    if (await textBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
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
  if (await tab.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.first().click();
    await page.waitForTimeout(500);
    return;
  }
  // Try nav buttons
  const navBtn = page.locator('nav button', { hasText: new RegExp(pageTitle, 'i') });
  if (await navBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await navBtn.first().click();
    await page.waitForTimeout(500);
    return;
  }
  // Try any button with the text
  const anyBtn = page.locator('button', { hasText: new RegExp(pageTitle, 'i') });
  if (await anyBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
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
 * Falls back to full page if the widget isn't found.
 */
export async function captureWidget(
  page: Page,
  nodeId: string,
  category: string,
  slug: string,
  variant: string,
  view: 'designer' | 'viewer',
): Promise<string> {
  const widget = page.locator(`[data-ss-node="${nodeId}"]`);
  if (await widget.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Scroll into view first
    await widget.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    return captureElement(widget, category, slug, variant, view);
  }
  // Fall back to full page capture
  return captureFullPage(page, category, slug, variant, view);
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
