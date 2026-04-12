#!/usr/bin/env python3
"""
Rewire empty <ScreenshotComparison label="..." /> stubs in MDX files.

For config-option sections (those without designerSrc/viewerSrc), replaces
the empty ScreenshotComparison with a FeatureScreenshot showing the property
panel. First half of config options get the props screenshot, second half
get the scrolled screenshot.

For pages without props screenshots, uses the best available screenshot.
"""

import re
import os
import glob
from pathlib import Path

DOCS_ROOT = Path(__file__).parent.parent / "src" / "content" / "docs"
ASSETS_ROOT = Path(__file__).parent.parent / "src" / "assets" / "screenshots"

# Map category/slug → list of available screenshot files (stems only)
def get_available_screenshots():
    """Return dict: { 'chart-types/line-chart': ['line-chart-default-designer', ...], ... }"""
    result = {}
    for png in ASSETS_ROOT.rglob("*.png"):
        cat = png.parent.name
        stem = png.stem
        key = cat  # group by category directory
        result.setdefault(key, []).append(stem)
    return result

def slug_from_file(filepath):
    """Extract slug from MDX filepath: '.../chart-types/line-chart.mdx' -> 'line-chart'"""
    return Path(filepath).stem

def category_from_file(filepath):
    """Extract category: '.../chart-types/line-chart.mdx' -> 'chart-types'"""
    return Path(filepath).parent.name

def find_props_screenshots(slug, category, available):
    """Find the props and scrolled-props screenshots for a given slug+category."""
    cat_screenshots = available.get(category, [])
    
    props = None
    scrolled = None
    
    # Direct match: {slug}-props-designer
    if f"{slug}-props-designer" in cat_screenshots:
        props = f"{slug}-props-designer"
    if f"{slug}-props-scrolled-designer" in cat_screenshots:
        scrolled = f"{slug}-props-scrolled-designer"
    
    return props, scrolled

def find_best_fallback(slug, category, available):
    """For files without props screenshots, find the best available screenshot."""
    cat_screenshots = available.get(category, [])
    
    # Priority order for fallbacks
    candidates = []
    for s in cat_screenshots:
        if slug in s:
            candidates.append(s)
    
    # Prefer designer screenshots
    designer = [c for c in candidates if 'designer' in c]
    viewer = [c for c in candidates if 'viewer' in c]
    
    if designer:
        return designer[0]
    if viewer:
        return viewer[0]
    
    # If no slug match, use any screenshot from the category
    if cat_screenshots:
        designer_any = [c for c in cat_screenshots if 'designer' in c]
        if designer_any:
            return designer_any[0]
        return cat_screenshots[0]
    
    return None

def compute_import_path(mdx_file, category, screenshot_stem):
    """Compute relative import path from MDX file to screenshot asset."""
    # MDX files are at src/content/docs/{category}/{file}.mdx
    # Screenshots are at src/assets/screenshots/{category}/{stem}.png
    return f"../../../assets/screenshots/{category}/{screenshot_stem}.png"

def make_import_name(stem):
    """Convert screenshot stem to a valid JS import name."""
    return stem.replace("-", "_")

def process_mdx(filepath, available):
    """Process a single MDX file, replacing empty ScreenshotComparison stubs."""
    with open(filepath) as f:
        content = f.read()
    
    slug = slug_from_file(filepath)
    category = category_from_file(filepath)
    
    # Find all ScreenshotComparison usages
    # Pattern: <ScreenshotComparison\n  label="..."\n/>
    empty_pattern = re.compile(
        r'<ScreenshotComparison\s+label="([^"]+)"\s*/>', re.DOTALL
    )
    
    empty_matches = list(empty_pattern.finditer(content))
    if not empty_matches:
        return False  # nothing to do
    
    # Determine which screenshots to use
    props, scrolled = find_props_screenshots(slug, category, available)
    fallback = find_best_fallback(slug, category, available)
    
    # Special mappings for categories without per-slug props screenshots
    FILTER_FALLBACKS = {
        "select-filter": ["filter-builder-default-designer", "select-filter-active-viewer"],
        "date-filter": ["filter-builder-default-designer", "filter-bar-active-viewer"],
        "cross-filtering": ["cross-filter-default-viewer", "filter-bar-active-viewer"],
        "filter-scope": ["filter-builder-default-designer", "filter-bar-default-viewer"],
    }
    
    LAYOUT_FALLBACKS = {
        "grid": ["grid-overview-designer", None],
        "header": ["header-props-designer", None],
        "divider": ["divider-props-designer", None],
        "rows-columns": ["rows-columns-overview-viewer", None],
        "tabs": ["tabs-viewer-tabs-viewer", None],
    }
    
    PAGES_FALLBACKS = {
        "multi-page": ["page-management-default-designer", "multi-page-page1-viewer"],
        "navigation": ["navigation-page-tabs-designer", "pages-scenario-page1-viewer"],
    }
    
    IMPORT_EXPORT_FALLBACKS = {
        "code-view": ["code-view-schema-designer", "code-view-default-designer"],
        "import": ["import-dialog-designer", "designer-default-designer"],
        "json-export": ["json-export-dialog-designer", "import-export-toolbar-default-designer"],
    }
    
    GETTING_STARTED_FALLBACKS = {
        "first-dashboard": [
            "first-dashboard-component-palette-designer",
            "first-dashboard-layers-designer",
            "first-dashboard-toolbar-designer",
            "first-dashboard-viewer-overview-viewer",
            "first-dashboard-designer-overview-designer",
        ],
    }
    
    INTERACTION_FALLBACKS = {
        "click-actions": ["click-actions-panel-designer", "interaction-editor-default-designer"],
        "drill-down": ["interaction-editor-default-designer", "click-actions-panel-designer"],
    }
    
    # Build the replacement plan
    new_imports = set()
    replacements = []
    
    for i, match in enumerate(empty_matches):
        label = match.group(1)
        screenshot_stem = None
        alt_text = label
        
        if props and scrolled:
            # Chart types and widgets with props screenshots
            halfway = len(empty_matches) // 2
            if i < halfway:
                screenshot_stem = props
            else:
                screenshot_stem = scrolled
        elif category == "filters" and slug in FILTER_FALLBACKS:
            fb = FILTER_FALLBACKS[slug]
            screenshot_stem = fb[0] if i < len(empty_matches) // 2 else (fb[1] or fb[0])
        elif category == "layout" and slug in LAYOUT_FALLBACKS:
            fb = LAYOUT_FALLBACKS[slug]
            screenshot_stem = fb[0] if fb[0] else fallback
            if fb[1] and i >= len(empty_matches) // 2:
                screenshot_stem = fb[1]
        elif category == "pages" and slug in PAGES_FALLBACKS:
            fb = PAGES_FALLBACKS[slug]
            screenshot_stem = fb[0] if i < len(empty_matches) // 2 else (fb[1] or fb[0])
        elif category == "import-export" and slug in IMPORT_EXPORT_FALLBACKS:
            fb = IMPORT_EXPORT_FALLBACKS[slug]
            screenshot_stem = fb[0] if i < len(empty_matches) // 2 else (fb[1] or fb[0])
        elif category == "getting-started" and slug in GETTING_STARTED_FALLBACKS:
            fb = GETTING_STARTED_FALLBACKS[slug]
            screenshot_stem = fb[i % len(fb)]
        elif category == "interactions" and slug in INTERACTION_FALLBACKS:
            fb = INTERACTION_FALLBACKS[slug]
            screenshot_stem = fb[0] if i < len(empty_matches) // 2 else (fb[1] or fb[0])
        else:
            screenshot_stem = fallback
        
        if not screenshot_stem:
            print(f"  WARNING: No screenshot for {filepath} stub #{i+1}: {label}")
            continue
        
        import_name = make_import_name(screenshot_stem)
        import_path = compute_import_path(filepath, category, screenshot_stem)
        
        new_imports.add((import_name, import_path))
        
        # Determine caption based on whether it's a props or viewer screenshot
        if "props" in screenshot_stem:
            caption = f"Configure {label.lower()} in the property panel"
        elif "viewer" in screenshot_stem:
            caption = label
        else:
            caption = label
        
        replacement = (
            f'<FeatureScreenshot\n'
            f'  src={{{import_name}}}\n'
            f'  alt="{alt_text}"\n'
            f'  caption="{caption}"\n'
            f'/>'
        )
        replacements.append((match.start(), match.end(), replacement))
    
    if not replacements:
        return False
    
    # Apply replacements in reverse order to preserve positions
    new_content = content
    for start, end, replacement in reversed(replacements):
        new_content = new_content[:start] + replacement + new_content[end:]
    
    # Add FeatureScreenshot import if not present
    if "import FeatureScreenshot" not in new_content:
        # Find the last import line and add after it
        import_lines = list(re.finditer(r'^import .+$', new_content, re.MULTILINE))
        if import_lines:
            last_import_end = import_lines[-1].end()
            feat_import = "\nimport FeatureScreenshot from '../../../components/FeatureScreenshot.astro';"
            new_content = new_content[:last_import_end] + feat_import + new_content[last_import_end:]
    
    # Add screenshot imports
    for import_name, import_path in sorted(new_imports):
        if f"import {import_name}" not in new_content:
            import_lines = list(re.finditer(r'^import .+$', new_content, re.MULTILINE))
            if import_lines:
                last_import_end = import_lines[-1].end()
                new_import = f"\nimport {import_name} from '{import_path}';"
                new_content = new_content[:last_import_end] + new_import + new_content[last_import_end:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    return True

def main():
    available = get_available_screenshots()
    print(f"Available screenshots by category:")
    for cat, stems in sorted(available.items()):
        print(f"  {cat}: {len(stems)} files")
    print()
    
    mdx_files = sorted(glob.glob(str(DOCS_ROOT / "**" / "*.mdx"), recursive=True))
    
    modified = 0
    for filepath in mdx_files:
        # Check if file has empty stubs
        with open(filepath) as f:
            content = f.read()
        
        empty_count = len(re.findall(r'<ScreenshotComparison\s+label="[^"]+"\s*/>', content))
        if empty_count == 0:
            continue
        
        slug = slug_from_file(filepath)
        category = category_from_file(filepath)
        print(f"Processing {category}/{slug}.mdx ({empty_count} stubs)...")
        
        if process_mdx(filepath, available):
            modified += 1
            print(f"  ✓ Rewired {empty_count} stubs")
        else:
            print(f"  ✗ No changes made")
    
    print(f"\nDone. Modified {modified} files.")

if __name__ == "__main__":
    main()
