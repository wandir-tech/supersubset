# Browser Test Plan A — Designer Happy Path

## Objective
Verify the core designer workflow from empty dashboard to exported canonical schema.

## Prerequisites
- Dev app running at `http://localhost:5173`
- Sample metadata model loaded (Prisma fixture or JSON fixture)
- Chrome with DevTools MCP available

## Steps

### 1. Launch & Initial Load
- [ ] Navigate to designer URL
- [ ] Verify designer loads without console errors
- [ ] Take screenshot: empty designer state
- [ ] Verify widget palette is visible with categories

### 2. Load Metadata Model
- [ ] Trigger metadata load (button or prop)
- [ ] Verify entities appear in data model browser
- [ ] Verify fields are categorized (dimensions, measures, time)
- [ ] Take screenshot: metadata browser

### 3. Create New Dashboard
- [ ] Click "New Dashboard" or equivalent
- [ ] Set title: "Test Dashboard A"
- [ ] Verify empty canvas appears
- [ ] Take screenshot: empty canvas

### 4. Add Line Chart Widget
- [ ] Drag "Line Chart" from palette to canvas
- [ ] Verify widget placeholder appears
- [ ] Open property panel
- [ ] Bind X-axis to time field
- [ ] Bind Y-axis to measure field
- [ ] Verify chart renders with data
- [ ] Take screenshot: line chart configured

### 5. Add Bar Chart Widget
- [ ] Drag "Bar Chart" to canvas below line chart
- [ ] Bind dimension and measure fields
- [ ] Verify chart renders
- [ ] Take screenshot: two charts on canvas

### 6. Add Table Widget
- [ ] Drag "Table" to canvas
- [ ] Select 3-4 columns from metadata
- [ ] Verify table renders with headers and data
- [ ] Take screenshot: table added

### 7. Add KPI Card Widget
- [ ] Drag "KPI Card" to canvas
- [ ] Bind measure field
- [ ] Configure label
- [ ] Verify KPI displays value
- [ ] Take screenshot: KPI card

### 8. Configure Filters
- [ ] Add filter bar widget or dashboard filter
- [ ] Bind to a dimension field
- [ ] Verify filter appears with options
- [ ] Apply filter and verify charts update
- [ ] Take screenshot: filtered state

### 9. Save to Canonical Schema
- [ ] Click "Save" / trigger save callback
- [ ] Capture the emitted schema object
- [ ] Verify `schemaVersion` field present
- [ ] Verify all 4 widgets are in the definition
- [ ] Verify data bindings are preserved

### 10. Export JSON
- [ ] Trigger JSON export
- [ ] Capture exported JSON content
- [ ] Parse and validate against JSON Schema
- [ ] Verify structure matches canonical types

### 11. Export YAML
- [ ] Trigger YAML export
- [ ] Capture exported YAML content
- [ ] Parse YAML back to object
- [ ] Compare with JSON export — must be semantically identical

### 12. Reload & Verify
- [ ] Import the exported JSON into a fresh designer
- [ ] Verify all 4 widgets appear
- [ ] Verify data bindings are intact
- [ ] Verify filter configuration preserved
- [ ] Take screenshot: reloaded state
- [ ] Compare with screenshot from step 8 — layouts must match

## Pass Criteria
- All steps complete without console errors
- Exported JSON and YAML are semantically equivalent
- Reloaded dashboard is visually identical to saved state
- All screenshots captured and saved
