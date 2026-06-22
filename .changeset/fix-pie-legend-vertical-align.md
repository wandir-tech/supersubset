---
'@supersubset/designer': patch
'@supersubset/charts-echarts': patch
---

Fix analytics dashboard editor publish validation and pie chart legend:

- Map Puck ColumnBlock `verticalAlign` CSS values to canonical schema (`top`/`center`/`bottom`; omit `stretch`).
- Respect `showLegend: false` on pie charts (remove hard-coded legend fallback).
- Reserve canvas space when a pie legend is shown so the series stays visible (center/radius layout).
- Reduce overlapping outside labels on skewed pie data when legend is off (`hideOverlap`, `minShowLabelAngle`).
- Deduplicate table columns when runtime metadata repeats a configured field id (fixes React key warnings in host E2E).
