# Browser Test Plan E — Designer Page Management

## Objective
Verify that the designer page-management controls remain usable without collapsing the main canvas, and that page creation, rename, and deletion behave predictably.

## Scenarios

### 1. Designer shell remains usable at medium desktop widths
- [ ] Open the dev app and switch to Designer mode
- [ ] Resize to a medium desktop viewport around `900x760`
- [ ] Verify the header controls stay on a compact horizontal strip
- [ ] Verify the main designer canvas remains visible and large enough to edit
- [ ] Verify page controls and host actions remain reachable without vertical collapse

### 2. Add page
- [ ] Click `Add Page`
- [ ] Verify a new page is created with the next default title
- [ ] Verify the new page becomes the active editing page immediately

### 3. Rename page
- [ ] Edit the active page title from the header control
- [ ] Commit with blur or `Enter`
- [ ] Verify the page chip label updates to the new title

### 4. Delete non-active page
- [ ] Trigger delete from a specific non-active page chip
- [ ] Verify the confirmation prompt names the targeted page
- [ ] Confirm deletion
- [ ] Verify the targeted page is removed and the current active page remains selected

### 5. Delete active page
- [ ] Select a page
- [ ] Trigger delete from that page chip
- [ ] Verify the confirmation prompt names the active page
- [ ] Confirm deletion
- [ ] Verify the editor falls back to the previous page, or the first remaining page when necessary

### 6. Dashboard metadata separation
- [ ] Verify dashboard title editing lives in the header controls, not the page-scoped property panel
- [ ] Verify the right-side property panel no longer presents dashboard title as if it were a page field

## Automated Mapping
- `e2e/workflows/designer-page-management.spec.ts`
  - medium-width canvas visibility
  - page add + rename
  - targeted page delete confirmation
  - active-page delete fallback

## Pass Criteria
- The designer canvas remains visible and usable at medium desktop widths
- Page deletion is always explicit about which page will be removed
- Page add/rename/delete flows work without console errors
- Dashboard-level metadata stays outside the page-scoped inspector