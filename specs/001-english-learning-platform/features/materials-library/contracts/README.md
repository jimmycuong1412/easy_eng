# Materials Library — Contract index

External interfaces this feature exposes. Each contract is normative; implementations MUST match.

| Contract file | Surface | Consumer |
|---------------|---------|----------|
| `rest-materials.openapi.yaml` | PostgREST + custom RPC HTTP surface | Frontend (Next.js + Edge), 3rd-party content tools |
| `rpc-award-completion.md` | Postgres RPC `award_material_completion` | Edge functions, Frontend `useCompleteMaterial()` hook |
| `rpc-grade-mock-test.md` | Postgres RPC `grade_mock_test` | Edge function `grade-mock-test`, Frontend `MockTestPlayer` |
| `edge-publish.md` | Supabase Edge Function `materials-publish` (HTTP POST) | Admin UI, Teacher submission UI |
| `component-material-card.md` | React component `<MaterialCard>` | Catalog page, Personal library, Recommendation widget on dashboard |

Skipped: there is no public API for 3rd-party developers in v1. PostgREST + Edge Functions are platform-internal contracts only.
