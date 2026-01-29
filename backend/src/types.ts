export type Model = {
  id: string;
  slug: string;
  name: string;
  creator: string;
  address: string;
  category: string;
  categorySlug: string;
  tags: string[];
  rating: number;
  downloads: string;
  downloadsCount: number;
  priceEth: number;
  price: string;
  image: string;
  description: string;
  version: string;
  status: "Active" | "Compiling" | "Paused";
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  role: "DEVELOPER" | "CREATOR";
  walletAddress?: string;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: string;
  createdAt: string;
};

export type Acquisition = {
  id: string;
  modelSlug: string;
  userId: string;
  walletAddress: string;
  priceEth: number;
  txHash: string;
  createdAt: string;
};

export type InferenceJob = {
  id: string;
  modelSlug: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "failed";
  result?: string;
  latencyMs?: number;
  createdAt: string;
  completedAt?: string;
};

export type Category = {
  name: string;
  slug: string;
  count: number;
};
