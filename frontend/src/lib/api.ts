const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type ApiModel = {
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
  price: string;
  priceEth: number;
  image: string;
  description: string;
  version: string;
  status: "Active" | "Compiling" | "Paused";
};

export type ModelsResponse = {
  items: ApiModel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: { category: string; q: string; tag: string };
};

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(String(message));
  }
  return data as T;
}

export const api = {
  baseUrl: API_URL,
  health: () => request<{ ok: boolean }>("/api/health"),
  categories: () =>
    request<{ items: { name: string; slug: string; count: number }[] }>(
      "/api/categories",
    ),
  models: (params?: {
    category?: string;
    q?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== "all") {
      qs.set("category", params.category);
    }
    if (params?.q) qs.set("q", params.q);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const query = qs.toString();
    return request<ModelsResponse>(`/api/models${query ? `?${query}` : ""}`);
  },
  model: (slug: string) =>
    request<{ model: ApiModel; related: ApiModel[] }>(`/api/models/${slug}`),
  createModel: (body: Record<string, unknown>, token: string) =>
    request<{ model: ApiModel }>("/api/models", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  acquire: (slug: string, walletAddress?: string, token?: string) =>
    request<{ acquisition: { txHash: string; priceEth: number }; model: ApiModel }>(
      `/api/models/${slug}/acquire`,
      {
        method: "POST",
        body: JSON.stringify({ walletAddress }),
        token,
      },
    ),
  infer: (
    slug: string,
    body: { prompt: string; steps?: number; guidanceScale?: number },
  ) =>
    request<{
      job: {
        id: string;
        status: string;
        result?: string;
        latencyMs?: number;
      };
    }>(`/api/models/${slug}/infer`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  signup: (body: {
    email: string;
    passphrase: string;
    role: "DEVELOPER" | "CREATOR";
    acceptTerms: boolean;
  }) =>
    request<{ token: string; user: { email: string; role: string } }>(
      "/api/auth/signup",
      { method: "POST", body: JSON.stringify(body) },
    ),
  login: (body: { email: string; passphrase: string }) =>
    request<{ token: string; user: { email: string; role: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) },
    ),
  wallet: (walletAddress: string, role?: "DEVELOPER" | "CREATOR") =>
    request<{ token: string; user: { walletAddress?: string; email: string } }>(
      "/api/auth/wallet",
      {
        method: "POST",
        body: JSON.stringify({ walletAddress, role }),
      },
    ),
  dashboard: (token?: string) =>
    request<{
      stats: { label: string; value: string; meta: string }[];
      models: {
        slug: string;
        name: string;
        status: string;
        price: string;
        rating: number;
      }[];
      revenueSeries: number[];
      months: string[];
      headline: string;
      wallet: string;
    }>("/api/dashboard", { token }),
  chainStatus: () =>
    request<{
      ok: boolean;
      connected: boolean;
      marketplace?: string;
      chainId?: number;
      blockNumber?: number;
    }>("/api/chain/status"),
  chainListing: (slug: string) =>
    request<{
      listing: {
        tokenId: number;
        priceEth: string;
        totalLicensesSold: number;
        active: boolean;
        creator: string;
      };
    }>(`/api/chain/listing/${slug}`),
  chainList: (slug: string) =>
    request<{ listing?: unknown; txHash?: string | null }>(
      `/api/chain/list/${slug}`,
      { method: "POST", body: "{}" },
    ),
  chainAcquireConfirm: (
    slug: string,
    body: { txHash: string; walletAddress: string },
  ) =>
    request(`/api/chain/acquire/${slug}`, {
      method: "POST",
      body: JSON.stringify({ mode: "confirm", ...body }),
    }),
  chainListConfirm: (
    slug: string,
    body: {
      txHash: string;
      walletAddress: string;
      name: string;
      description: string;
      category: string;
      categorySlug: string;
      tags: string[];
      priceEth: number;
      framework?: "PyTorch" | "TensorFlow" | "ONNX";
    },
    token: string,
  ) =>
    request<{ mode: string; model: ApiModel; txHash: string }>(
      `/api/chain/list/${slug}`,
      {
        method: "POST",
        body: JSON.stringify({ mode: "confirm", ...body }),
        token,
      },
    ),
};

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("NuvyraHub_token", token);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("NuvyraHub_token");
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("NuvyraHub_token");
  }
}
