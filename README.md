# NuvyraHub monorepo

## Projects

| Folder | Role | Port |
|--------|------|------|
| `frontend` | Frontend | 3000 |
| `backend` | REST API + chain relay | 4000 |
| `contracts-project` | Hardhat ERC-1155 marketplace | 8545 |

## Start everything

```bash
# 1) Local chain
cd contracts-project
npm run node

# 2) Deploy (other terminal)
cd contracts-project
npm run deploy:local
npm run export-abi

# 3) Backend
cd backend
npm run dev

# 4) Frontend
cd frontend
npm run dev
```

## On-chain flow

1. Creator publishes model → backend `listModel` on `NuvyraHubMarketplace`
2. Buyer clicks **Acquire Contract (Relay)** → backend buyer wallet pays ETH + mints ERC-1155
3. Or **Acquire With MetaMask** → wallet signs `acquireLicense` directly, backend records tx

Marketplace: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (local Hardhat)
