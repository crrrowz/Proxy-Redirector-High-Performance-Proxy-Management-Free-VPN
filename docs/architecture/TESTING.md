# 🧪 Testing Architecture & Verification Strategy

---

## 1. Testing Pyramid & Principles

The repository enforces three distinct levels of automated verification:

1. **Unit Tests (Fast & Isolated)**:
   - Go: `*_test.go` in every internal package using pure standard library `testing`.
   - Node.js: `node:test` and `node:assert` for domain entities, use-cases, and cryptographic helpers.
2. **Integration & Mock Tests**:
   - Go: `client/tests/integration_test.go` with mock gRPC servers (`client/tests/mock/mock_grpc.go`).
   - Node.js: Express application integration tests validating `/health` and route middleware.
3. **Continuous Integration Pipeline**:
   - Multi-OS GitHub Actions workflow (`.github/workflows/ci.yml`) executing on every push and pull request with `-race` detection enabled.
