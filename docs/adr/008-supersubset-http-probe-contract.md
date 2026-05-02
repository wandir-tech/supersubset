# ADR-008: Supersubset HTTP Probe Contract

## Status

Proposed

## Date

2026-05-01

## Context

Supersubset's development probe and host-side workbench flows need a stable HTTP contract for two operations:

- discovery of normalized datasets for the designer
- execution of logical preview queries against a host-owned backend

Before this contract was documented, the repository had working probe code in `packages/dev-app/src/probe/`, but the wire format remained implicit in implementation details and issue discussion. That made it harder for host applications to know which endpoints and envelopes they should expose, and it made it harder to reason about compatibility across probe-capable hosts.

The repository already contains the contract types in `@supersubset/data-model`:

- `PROBE_PROTOCOL_VERSION`
- `ProbeCapabilities`
- `ProbeDatasetsResponse`
- `ProbeQueryRequest`
- `ProbeQueryResponse`
- `ProbeErrorResponse`

This ADR documents how those types map to the HTTP surface used by the developer probe.

## Decision

Supersubset documents a probe-compatible HTTP contract with these conventions:

1. Discovery endpoint: `GET {base}/supersubset/datasets`
2. Query endpoint: `POST {base}/supersubset/query`
3. Discovery responses should use `ProbeDatasetsResponse`
4. Query requests use `LogicalQuery` / `ProbeQueryRequest`
5. Query responses should use `ProbeQueryResponse`
6. Error responses should use `ProbeErrorResponse`
7. Authentication remains host-owned and transport-level: the caller supplies headers such as `Authorization: Bearer <token>` or a custom API key header

The probe contract is intentionally thin:

- it reuses the existing normalized metadata model and logical query model
- it does not prescribe database access, ORM choice, or authentication framework
- it keeps the runtime and designer backend-agnostic

For rollout compatibility, the dev probe remains permissive when reading discovery payloads:

- canonical envelope: `{ protocolVersion, capabilities, datasets }`
- compatibility envelope: `{ datasets }`
- legacy compatibility payload: `NormalizedDataset[]`

Likewise, query execution may return either the canonical `ProbeQueryResponse` envelope or a plain `QueryResult`, because the probe only consumes the shared `columns` and `rows` shape.

This compatibility layer exists in the dev-only probe adapters and does not change the published runtime/designer APIs.

## Consequences

### Positive

- Host teams have a documented backend shape to target when validating Supersubset compatibility.
- The contract is anchored in `@supersubset/data-model`, not scattered across issue threads or dev-only code.
- The probe remains backend-agnostic while still giving developers a fast validation loop.
- Existing hosts using legacy discovery payloads keep working during migration to the canonical envelope.

### Negative

- The compatibility layer means the dev probe must continue accepting more than one discovery payload shape.
- The repository now has an explicitly documented transport contract that future changes must version carefully.

### Neutral

- The contract is documented here as proposed because the wire format already exists in code, but broader package-level graduation is still a separate decision.
- This ADR does not create a new published adapter package; the current HTTP adapters stay in `packages/dev-app/src/probe/`.

## Alternatives Considered

| Alternative                                                               | Pros                                                 | Cons                                                                                          | Why Rejected                                                                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Keep the probe contract implicit in `ProbeWorkspace` and issue discussion | No extra documentation work                          | Host implementations would rely on code archaeology and drift-prone assumptions               | Rejected because the contract is already important enough to document explicitly                                 |
| Require only the strict canonical envelope immediately                    | Cleaner contract from day one                        | Would break existing probe-compatible hosts returning `NormalizedDataset[]` or `{ datasets }` | Rejected because the dev probe already supports compatibility shapes and there is no need to break them abruptly |
| Publish a dedicated HTTP adapter package now                              | Could make the contract reusable outside the dev app | Increases surface area, packaging, and maintenance burden                                     | Rejected for now because the current need is documentation and validation, not package extraction                |
| Add OAuth/PKCE requirements to the contract                               | More production-like auth flow                       | Couples a dev probe to browser auth flows and callback management                             | Rejected because probe auth stays host-owned and header-based in v1                                              |

## References

- [Issue #52](https://github.com/wandir-tech/supersubset/issues/52)
- [Metadata And CLI API](../api/metadata-and-cli.md)
- `packages/data-model/src/index.ts`
- `packages/dev-app/src/probe/http-adapters.ts`
