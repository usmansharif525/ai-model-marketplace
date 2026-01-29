# NuvyraHub Backend

Express + TypeScript API for the NuvyraHub marketplace.

## Run

```bash
cd backend
npm install
npm run dev
```

API base: `http://localhost:4000`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | no | Service health |
| GET | `/api/categories` | no | Category list |
| GET | `/api/tags` | no | Tag frequencies |
| GET | `/api/models` | no | List/filter models (`category`, `q`, `tag`, `page`, `pageSize`) |
| GET | `/api/models/:slug` | no | Model detail + related |
| POST | `/api/models` | Bearer | Publish a model |
| PATCH | `/api/models/:slug` | Bearer | Update model |
| DELETE | `/api/models/:slug` | Bearer | Delete model |
| POST | `/api/models/:slug/acquire` | optional | Acquire ownership contract |
| POST | `/api/models/:slug/infer` | optional | Run demo inference |
| GET | `/api/models/:slug/inferences` | no | Recent inference jobs |
| POST | `/api/auth/signup` | no | Create account |
| POST | `/api/auth/login` | no | Sign in |
| POST | `/api/auth/wallet` | no | Connect wallet |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/dashboard` | optional | Creator dashboard metrics |

## Example

```bash
curl http://localhost:4000/api/models?category=llm
curl -X POST http://localhost:4000/api/auth/wallet -H "Content-Type: application/json" -d "{\"walletAddress\":\"0xABC123\"}"
curl -X POST http://localhost:4000/api/models/visionforge-pro/infer -H "Content-Type: application/json" -d "{\"prompt\":\"neon city\"}"
```
