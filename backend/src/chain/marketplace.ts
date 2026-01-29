import fs from "fs";
import path from "path";
import { Contract, JsonRpcProvider, Wallet, parseEther, formatEther } from "ethers";

const abiJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "abi", "NuvyraHubMarketplace.json"),
    "utf8",
  ),
);

const DEFAULT_RPC = "http://127.0.0.1:8545";
const DEFAULT_MARKETPLACE = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const DEFAULT_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function loadSharedAddress(): string | null {
  try {
    const candidates = [
      path.join(__dirname, "..", "..", "..", "shared", "contracts.json"),
      path.join(process.cwd(), "..", "shared", "contracts.json"),
      path.join(process.cwd(), "shared", "contracts.json"),
    ];
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (data.marketplace) return data.marketplace as string;
    }
    return null;
  } catch {
    return null;
  }
}

function rpcUrl() {
  return process.env.RPC_URL || DEFAULT_RPC;
}

function marketplaceAddress() {
  return (
    process.env.MARKETPLACE_ADDRESS ||
    loadSharedAddress() ||
    DEFAULT_MARKETPLACE
  );
}

function deployerKey() {
  const rpc = rpcUrl();
  if (rpc.includes("127.0.0.1") || rpc.includes("localhost")) {
    return DEFAULT_KEY;
  }
  const raw = (process.env.DEPLOYER_PRIVATE_KEY || "").trim().replace(/^"|"$/g, "");
  if (!raw || raw.length < 64) return DEFAULT_KEY;
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function buyerKey() {
  const rpc = rpcUrl();
  const fallback =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  if (rpc.includes("127.0.0.1") || rpc.includes("localhost")) {
    return fallback;
  }
  const raw = (process.env.BUYER_PRIVATE_KEY || "").trim().replace(/^"|"$/g, "");
  if (!raw || raw.length < 64) return fallback;
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

export function getProvider() {
  return new JsonRpcProvider(rpcUrl());
}

export function getDeployerWallet() {
  return new Wallet(deployerKey(), getProvider());
}

export function getBuyerWallet() {
  return new Wallet(buyerKey(), getProvider());
}

export function getMarketplace(signerOrProvider?: Wallet | JsonRpcProvider) {
  return new Contract(
    marketplaceAddress(),
    abiJson.abi,
    signerOrProvider || getProvider(),
  );
}

export async function getChainStatus() {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    const market = marketplaceAddress();
    const code = await provider.getCode(market);
    const wallet = getDeployerWallet();
    const balance = await provider.getBalance(wallet.address);
    return {
      ok: code !== "0x",
      rpcUrl: rpcUrl(),
      chainId: Number(network.chainId),
      marketplace: market,
      blockNumber: block,
      deployer: wallet.address,
      deployerBalanceEth: formatEther(balance),
      connected: true,
    };
  } catch (error) {
    return {
      ok: false,
      rpcUrl: rpcUrl(),
      marketplace: marketplaceAddress(),
      connected: false,
      error: error instanceof Error ? error.message : "RPC unavailable",
    };
  }
}

export async function getOnChainListing(slug: string) {
  const market = getMarketplace();
  const tokenId: bigint = await market.getTokenIdBySlug(slug);
  if (tokenId === 0n) {
    return null;
  }
  const listing = await market.getListing(tokenId);
  return {
    tokenId: Number(tokenId),
    creator: listing.creator as string,
    priceWei: listing.priceWei.toString(),
    priceEth: formatEther(listing.priceWei),
    royaltyBps: Number(listing.royaltyBps),
    slug: listing.slug as string,
    metadataURI: listing.metadataURI as string,
    active: Boolean(listing.active),
    totalLicensesSold: Number(listing.totalLicensesSold),
  };
}

export async function listModelOnChain(input: {
  slug: string;
  metadataURI: string;
  priceEth: number;
  royaltyBps?: number;
}) {
  const wallet = getDeployerWallet();
  const market = getMarketplace(wallet);
  const existing: bigint = await market.getTokenIdBySlug(input.slug);
  if (existing !== 0n) {
    const listing = await getOnChainListing(input.slug);
    return { alreadyListed: true, listing, txHash: null as string | null };
  }

  const tx = await market.listModel(
    input.slug,
    input.metadataURI,
    parseEther(String(input.priceEth)),
    input.royaltyBps ?? 500,
  );
  const receipt = await tx.wait();
  const listing = await getOnChainListing(input.slug);
  return {
    alreadyListed: false,
    listing,
    txHash: receipt?.hash || tx.hash,
  };
}

export async function acquireLicenseOnChain(slug: string, buyerPrivateKey?: string) {
  const listing = await getOnChainListing(slug);
  if (!listing) {
    throw new Error(`No on-chain listing for slug=${slug}`);
  }

  const wallet = buyerPrivateKey
    ? new Wallet(buyerPrivateKey, getProvider())
    : getBuyerWallet();

  const market = getMarketplace(wallet);
  const owned: boolean = await market.hasLicense(listing.tokenId, wallet.address);
  if (owned) {
    return {
      alreadyOwned: true,
      listing,
      buyer: wallet.address,
      txHash: null as string | null,
    };
  }

  const tx = await market.acquireLicense(listing.tokenId, {
    value: BigInt(listing.priceWei),
  });
  const receipt = await tx.wait();
  return {
    alreadyOwned: false,
    listing,
    buyer: wallet.address,
    txHash: receipt?.hash || tx.hash,
  };
}

export function buildAcquireTxRequest(listing: {
  tokenId: number;
  priceWei: string;
}) {
  const iface = new Contract(marketplaceAddress(), abiJson.abi).interface;
  const data = iface.encodeFunctionData("acquireLicense", [listing.tokenId]);
  return {
    to: marketplaceAddress(),
    data,
    value: listing.priceWei,
    chainId: 31337,
  };
}

export function buildListTxRequest(input: {
  slug: string;
  metadataURI: string;
  priceEth: number;
  royaltyBps?: number;
}) {
  const iface = new Contract(marketplaceAddress(), abiJson.abi).interface;
  const data = iface.encodeFunctionData("listModel", [
    input.slug,
    input.metadataURI,
    parseEther(String(input.priceEth)),
    input.royaltyBps ?? 500,
  ]);
  return {
    to: marketplaceAddress(),
    data,
    value: "0",
    chainId: 31337,
  };
}

export const chainConfig = {
  get rpcUrl() {
    return rpcUrl();
  },
  get marketplace() {
    return marketplaceAddress();
  },
  chainId: 31337,
  get abi() {
    return abiJson.abi;
  },
};
