# AGENTS.md

## Cursor Cloud specific instructions

**Kuake CLI** is a standalone Go CLI tool for managing files on Quark Cloud Drive (夸克网盘). It has **zero external Go dependencies** (stdlib only) and requires only Go 1.21+.

### Build & Run

- Build: `go build -o kuake ./cmd/main.go`
- Cross-platform build: `bash build.sh` (outputs to `dist/`)
- Run: `./kuake <command>` (e.g. `./kuake version`, `./kuake help`)

### Test

- Unit tests: `go test ./... -v`
  - Tests requiring Quark API access are automatically skipped (no cookie/network needed).
  - Integration tests require `INTEGRATION_TEST=1` env var and a valid `KUAKE_COOKIE`.
  - Two `TestUpdateHashCtxFromHash` subtests are pre-existing failures in the repo (Nl value unit mismatch); they are NOT regressions.
- Lint: `go vet ./...`

### Key caveats

- The CLI requires a valid Quark Drive cookie (`__pus=...`) for all API-calling commands. Without it, `version` and `help` still work.
- Cookie can be provided via: `-cookies` flag > `KUAKE_COOKIE` env var > `config.json` file.
- All JSON output goes to stdout; progress/help/errors go to stderr.
