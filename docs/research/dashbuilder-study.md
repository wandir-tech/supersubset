# Dashbuilder Study — Research Report

> **Task**: 0.4  
> **Agent**: Research  
> **Date**: 2026-04-08  
> **Repository**: `kiegroup/kie-tools` → `packages/dashbuilder/` (archived Aug 2025, now at `apache/incubator-kie-tools`)

## Executive Summary

Red Hat Dashbuilder is a Java/GWT-based dashboard and reporting tool that was part of the KIE (Knowledge Is Everything) project. It has been **archived** (August 2025) and migrated to Apache Incubator. The project offers conceptual inspiration for dashboard definition formats and editor/runtime split architecture, but as a Java/GWT application, it provides **zero reusable code** for a React/TypeScript project.

The key concepts worth studying are: (1) its YAML/JSON dashboard definition format with pages, components, and navigation; (2) the clean editor/runtime architecture split; (3) pluggable renderer system; and (4) static-client deployment model. However, the project's age, Java-centric architecture, and archived status make it purely an **architectural inspiration** source.

## Module Analysis

### 1. Dashboard Definition Format

- **What it does**: Dashbuilder uses a YAML/JSON-based dashboard definition that describes pages, components, data lookups, and navigation.
- **Key structure**:
  - `pages` — array of page definitions, each with `components` and `rows`
  - `components` — typed components (chart, table, metric, filter, HTML)
  - `datasets` — data source definitions (CSV, SQL, Prometheus, Kafka, EL providers)
  - `navigation` — tree structure for page navigation and menu items
  - `properties` — global dashboard properties
- **Classification**: **Architectural inspiration**
- **Rationale**: The concept of a YAML-based dashboard-as-file definition is valuable, but the actual format is Java-centric with GWT-specific rendering hints. Supersubset should design its own canonical schema influenced by this and Rill's approach.

### 2. Editor/Runtime Split Architecture

- **What it does**: Dashbuilder separates:
  - `dashbuilder-client/dashbuilder-displayer-editor` — visual editor for chart/display configuration
  - `dashbuilder-client/dashbuilder-displayer-client` — rendering runtime for displays
  - `dashbuilder-runtime-parent/dashbuilder-runtime-app` — standalone runtime application
- **Key subdirectories**:
  - `dashbuilder-client/dashbuilder-common-client` — shared types/utilities
  - `dashbuilder-client/dashbuilder-dataset-client` — data source client
  - `dashbuilder-client/dashbuilder-navigation-client` — page navigation
  - `dashbuilder-client/dashbuilder-renderers` — pluggable chart renderers
- **Classification**: **Architectural inspiration**
- **Rationale**: The separation principle (editor can run without runtime, runtime can run without editor) aligns with Supersubset's architecture invariant #5: "Renderer independent from editor."

### 3. Component Registry / Pluggable Renderers

- **What it does**: `dashbuilder-renderers` supports multiple chart rendering backends through a plugin system.
- **Approach**: Renderer implementations are registered by type. The runtime dispatches to the appropriate renderer based on the component type declaration in the dashboard definition.
- **Classification**: **Architectural inspiration**
- **Rationale**: The pluggable renderer concept maps to Supersubset's widget registry pattern. However, the GWT implementation details are not transferable.

### 4. Static Client Deployment

- **What it does**: Dashbuilder Runtime can serve dashboards as static web applications. Dashboard definitions are loaded from files (YAML/JSON) without requiring a backend server for definition storage.
- **Classification**: **Architectural inspiration**
- **Rationale**: This validates Supersubset's "host-owned persistence" principle. Dashboards-as-files is a viable distribution model that Supersubset should also support.

### 5. Dataset Abstraction

- **What it does**: `kie-soup-dataset` provides a data access abstraction layer supporting CSV, SQL databases, Elasticsearch, Prometheus, and Kafka.
- **Key concept**: Datasets are defined independently from visualizations. Components reference datasets by name.
- **Classification**: **Architectural inspiration**
- **Rationale**: The separation of data access from visualization is sound and aligns with Supersubset's adapter-first metadata approach. However, the Java implementation uses completely different patterns.

## Reusable Concepts vs Supersubset-Specific Needs

| Concept | Classification | Notes |
|---------|---------------|-------|
| YAML/JSON dashboard definition | Inspiration | Good concept, need our own schema |
| Page/navigation model | Inspiration | Multi-page dashboards with nav tree |
| Editor/runtime split | Inspiration | Validates our architecture invariant #5 |
| Pluggable renderers | Inspiration | Maps to widget registry pattern |
| Static-client deployment | Inspiration | Validates host-owned persistence |
| Dataset abstraction | Inspiration | Maps to adapter-first metadata |
| Component types (chart, table, metric) | Inspiration | Standard dashboard widget types |
| GWT/Java codebase | Discarded | Zero code reuse possible |
| Uberfire framework dependency | Discarded | Java-specific workbench framework |
| Maven build system | Discarded | Not relevant to npm/pnpm monorepo |

## Key Observations

1. **Archived project**: The kiegroup/kie-tools repository was archived August 2025 and migrated to Apache Incubator. This means no active community development, making it a poor long-term reference.

2. **Java/GWT technology**: The entire codebase is Java with GWT (Google Web Toolkit) for the frontend. No TypeScript, no React, no modern JavaScript patterns.

3. **Relatively simple dashboard model**: Compared to Superset or Rill, Dashbuilder's dashboard definition is simpler — which is actually a positive data point. It shows that a straightforward pages/components/datasets model can be sufficient.

4. **Validation of key architectural choices**: Dashbuilder independently arrived at several patterns that Supersubset also plans:
   - Dashboard-as-files (YAML/JSON)
   - Editor/runtime separation
   - Pluggable rendering backends
   - Host-owned data access
   - Static deployment capability

## License Assessment

- **License**: Apache License 2.0
- **Status**: Now under Apache Incubator (Apache KIE)
- **Incubation caveat**: Some files may have incomplete ASF licensing headers (noted in README)
- **Compatibility**: Fully compatible with Supersubset, but no code would be directly borrowed
