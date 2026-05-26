# Examples

This folder separates user-facing demo data from internal parser fixtures.

- `demo_data/` contains files intended for users to browse and import manually.
- `demo_data/iv_traces/` is the preferred default folder for the Import CSV/TXT file picker.
- `demo_data/publication_data/` is reserved for future publication-derived CSV files with citation and license metadata.
- `synthetic_data/` is for generated synthetic examples.
- `parser_fixtures/` contains development and regression fixtures. These are not presented as user-facing demo data.

Optional metadata convention:

```text
example_trace.csv
example_trace.meta.json
```

Suggested `.meta.json` fields: `title`, `source`, `citation`, `license`, and `notes`.
