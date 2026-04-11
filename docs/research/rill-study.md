# Rill Schema Study — Research Report

> **Task**: 0.3  
> **Agent**: Research  
> **Date**: 2026-04-08  
> **Repository**: `rilldata/rill` @ `main`

## Executive Summary

Rill's approach to dashboard definitions is deeply informative for Supersubset's canonical schema design. Rill uses a protobuf-defined resource model where dashboards are composed of **MetricsViews** (data models with dimensions/measures), **Explores** (dashboard configurations referencing a MetricsView), and **Canvases** (freeform layout dashboards with rows and items). The YAML/protobuf definitions are human-readable, version-controlled, and serve as the single source of truth — aligning perfectly with Supersubset's schema-first philosophy.

**Key takeaways**: (1) Rill's separation of data model (MetricsView) from presentation (Explore/Canvas) is excellent; (2) Their dimension/measure typing system with `DimensionType` and `MeasureType` enums is thorough; (3) The Canvas model with `CanvasRow` → `CanvasItem` layout is a clean alternative to nested trees; (4) Their security model (`SecurityRule`) is well-designed for row-level access. However, Rill's heavy metrics-view coupling and Svelte-based frontend are not reusable.

## Schema Examples with Annotations

### MetricsView — Data Model Definition

From `proto/rill/runtime/v1/resources.proto`:

```protobuf
message MetricsViewSpec {
  string connector = 1;          // Data source connector
  string table = 2;              // Source table name
  string model = 24;             // Or source model name
  string display_name = 3;       // Human-readable name
  string description = 4;        // Description
  string time_dimension = 5;     // Primary time column
  TimeGrain smallest_time_grain = 8;
  repeated Dimension dimensions = 6;  // Filterable/groupable columns
  repeated Measure measures = 7;      // Aggregated metrics
  repeated SecurityRule security_rules = 23;  // Row-level security
  uint32 first_day_of_week = 12;
  uint32 first_month_of_year = 13;
}
```

**Strengths**:
- ✅ Clean separation of **what data exists** (MetricsView) from **how to display it** (Explore/Canvas)
- ✅ Dimension/measure classification with types: `DIMENSION_TYPE_CATEGORICAL`, `DIMENSION_TYPE_TIME`, `DIMENSION_TYPE_GEOSPATIAL`
- ✅ Measures support types: `MEASURE_TYPE_SIMPLE`, `MEASURE_TYPE_DERIVED`, `MEASURE_TYPE_TIME_COMPARISON`
- ✅ Format controls: `format_preset`, `format_d3`, `format_d3_locale`
- ✅ `valid_percent_of_total` flag — smart domain-specific flag for BI
- ✅ `tags` on both dimensions and measures — useful for categorization

**Weaknesses**:
- ❌ Tight coupling: `connector`, `table`, `model` — assumes Rill's data infrastructure
- ❌ Single time dimension — dashboards often have multiple time fields
- ❌ `watermark_expression` is Rill-specific (streaming data watermark)

### Dimension Definition

```protobuf
message Dimension {
  string name = 1;
  DimensionType type = 14;        // categorical, time, geospatial
  string display_name = 3;
  string description = 4;
  repeated string tags = 16;
  string column = 2;              // Source column
  string expression = 6;          // Computed expression
  bool unnest = 5;                // Array unnesting
  string uri = 7;                 // Linked resource
  // Lookup fields
  string lookup_table = 8;
  string lookup_key_column = 9;
  string lookup_value_column = 10;
  TimeGrain smallest_time_grain = 13;  // For time dimensions
  Type data_type = 12;
}
```

**Supersubset borrowing**: The dimension type system (`categorical` / `time` / `geospatial`) and lookup support are excellent patterns. We should adopt:
- Dimension type classification
- Expression-based computed dimensions
- Lookup/join metadata for enrichment
- d3 format strings for display formatting

### Measure Definition

```protobuf
message Measure {
  string name = 1;
  string display_name = 3;
  string description = 4;
  repeated string tags = 16;
  string expression = 2;            // SQL expression
  MeasureType type = 8;             // simple, derived, time_comparison
  MeasureWindow window = 9;         // Windowing support
  repeated DimensionSelector per_dimensions = 10;
  repeated DimensionSelector required_dimensions = 11;
  repeated string referenced_measures = 12;
  string format_preset = 5;
  string format_d3 = 7;
  bool valid_percent_of_total = 6;
  string treat_nulls_as = 14;
}
```

**Supersubset borrowing**: `MeasureType` with `derived` and `time_comparison` support is sophisticated. The `MeasureWindow` for windowed aggregations and `required_dimensions` for measure dependency tracking are both patterns worth adopting.

### Explore — Dashboard Configuration

```protobuf
message ExploreSpec {
  string display_name = 1;
  string description = 2;
  string metrics_view = 3;       // References a MetricsView
  repeated string dimensions = 4;  // Subset of dimensions to show
  repeated string measures = 6;    // Subset of measures to show
  string theme = 8;
  ThemeSpec embedded_theme = 17;
  repeated ExploreTimeRange time_ranges = 9;
  repeated string time_zones = 10;
  ExplorePreset default_preset = 15;
  bool embeds_hide_pivot = 16;
  repeated SecurityRule security_rules = 12;
}
```

**Strengths**:
- ✅ `default_preset` — saved initial state (selected dimensions, time range, view, sort)
- ✅ Configurable time ranges with comparison ranges
- ✅ Theme reference or inline embedded theme
- ✅ Security rules at the explore level (separate from MetricsView security)

**Weaknesses**:
- ❌ This is Rill's "explore" product — a specific opinionated UI, not a general dashboard
- ❌ No free-form layout — Explore is a fixed pivot/leaderboard/time-series view

### Canvas — Freeform Layout Dashboard

```protobuf
message CanvasSpec {
  string display_name = 1;
  uint32 max_width = 2;          // Max width in pixels
  uint32 gap_x = 9;              // Horizontal gap
  uint32 gap_y = 10;             // Vertical gap
  string theme = 7;
  ThemeSpec embedded_theme = 8;
  repeated ExploreTimeRange time_ranges = 11;
  repeated string time_zones = 12;
  bool filters_enabled = 13;
  CanvasPreset default_preset = 15;
  repeated ComponentVariable variables = 5;
  repeated CanvasRow rows = 18;   // Layout rows
  repeated SecurityRule security_rules = 6;
  repeated string pinned_filters = 16;
}

message CanvasRow {
  optional uint32 height = 1;
  string height_unit = 2;        // "px" or ""
  repeated CanvasItem items = 3;
}

message CanvasItem {
  string component = 1;          // Component reference
  bool defined_in_canvas = 8;
  optional uint32 width = 9;
  string width_unit = 10;
}
```

**Strengths**:
- ✅ Row-based layout model — simple and predictable
- ✅ `max_width`, `gap_x`, `gap_y` — configurable layout parameters
- ✅ Variables system (`ComponentVariable`) for parameterized dashboards
- ✅ `pinned_filters` for always-visible filter controls
- ✅ `CanvasPreset` with filter expressions

**Weaknesses**:
- ❌ Row/item model is simpler than a full grid — no column spanning, no nested containers
- ❌ `width_unit` currently only supports empty string — limited flexibility
- ❌ Canvas references `Component` by name, requiring a separate component definition

### Component — Reusable Widget Definition

```protobuf
message ComponentSpec {
  string display_name = 1;
  string description = 7;
  string renderer = 4;            // Renderer type
  Struct renderer_properties = 5; // Renderer config
  repeated ComponentVariable input = 8;
  ComponentVariable output = 9;
  bool defined_in_canvas = 6;
}

message ComponentVariable {
  string name = 1;
  string type = 2;
  Value default_value = 3;
}
```

**Supersubset borrowing**: The `ComponentVariable` input/output model for components is interesting — enables dataflow between dashboard widgets (e.g., a filter widget outputting to chart widgets).

### Theme Definition

```protobuf
message ThemeSpec {
  optional Color primary_color = 1;
  optional Color secondary_color = 2;
  string primary_color_raw = 3;
  string secondary_color_raw = 4;
  optional ThemeColors light = 5;
  optional ThemeColors dark = 6;
}

message ThemeColors {
  string primary = 1;
  string secondary = 2;
  map<string, string> variables = 3;
}
```

**Supersubset borrowing**: Light/dark mode support with CSS variable maps is a pragmatic approach.

## Ideas Worth Borrowing

1. **Data model / presentation separation**: MetricsView (data) is separate from Explore/Canvas (presentation). Supersubset should similarly separate data model definitions from dashboard layout definitions.

2. **Dimension/Measure type system**: `DimensionType` (categorical, time, geospatial) and `MeasureType` (simple, derived, time_comparison) with `MeasureWindow` for windowed aggregations. This is a well-thought-out analytical type system.

3. **Format specifications**: Using d3 format strings (`format_d3`) for number formatting and locale-aware formatting. This is a standard approach.

4. **FieldSelector pattern**: Dynamic field selection via `{ all, fields, regex, duckdb_expression, invert }`. This is flexible — lets users define dimensions/measures by pattern matching, not just explicit listing.

5. **ComponentVariable input/output model**: Enables parameterized, composable dashboard widgets with explicit data contracts.

6. **Default preset state**: Saving the initial dashboard state (selected filters, time range, sort order) as a `Preset` definition. Supersubset should support `defaults` in its schema.

7. **Security rules at multiple levels**: Row-level (`SecurityRuleRowFilter`), field-level (`SecurityRuleFieldAccess`), and resource-level (`SecurityRuleAccess`) — each with `condition_expression` for dynamic evaluation.

8. **Canvas row/item layout**: Simple, predictable, human-readable. While Supersubset may need a more flexible layout model, the row-based approach is worth considering as a base.

## Ideas to Avoid

1. **Metrics-view lock-in**: Rill's entire system assumes a `MetricsView` → `Explore` pipeline. This is too opinionated for Supersubset, which must support arbitrary data sources.

2. **Single time dimension assumption**: `time_dimension` is singular. Real dashboards often have multiple time fields (order_date, ship_date, created_at).

3. **Protobuf-first definition**: Rill uses protobuf as the canonical format. Supersubset should use TypeScript types with Zod validation and JSON/YAML as serialization formats.

4. **Connector-coupled data model**: `connector`, `table`, `model` fields embed infrastructure details in the data model definition. Supersubset uses adapters to keep the data model abstract.

5. **Product-specific view types**: `ExploreWebView` with `EXPLORE`, `TIME_DIMENSION`, `PIVOT`, `CANVAS` are Rill-specific view modes. Supersubset should not assume specific view types.

## License Assessment

- **License**: Apache License 2.0
- **Attribution**: NOTICE file required for derived works
- **Compatibility**: Fully compatible with Supersubset
