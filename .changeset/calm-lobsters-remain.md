---
'@supersubset/charts-echarts': patch
---

Guard BaseChart cleanup against disposed ECharts instances so consumer apps do not emit disposed-instance warnings during unmount and remount flows.
