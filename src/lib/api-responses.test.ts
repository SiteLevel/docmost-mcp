import { describe, test, expect } from "bun:test";
import "dotenv/config";

const baseUrl = process.env.DOCMOST_API_URL;
const email = process.env.DOCMOST_EMAIL;
const password = process.env.DOCMOST_PASSWORD;

let token: string;

async function getAuthToken(): Promise<string> {
  if (token) return token;
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookies = response.headers.getSetCookie();
  const authCookie = cookies.find((c) => c.startsWith("authToken="));
  if (!authCookie) throw new Error("No auth token found in cookies");
  token = authCookie.match(/^authToken=([^;]+)/)![1];
  return token;
}

async function apiPost(endpoint: string, body: Record<string, any> = {}) {
  const t = await getAuthToken();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

describe("workspace", () => {
  test("/workspace/info returns data with id and name", async () => {
    const data = await apiPost("/workspace/info");
    expect(data.success).toBe(true);
    expect(data.data.id).toBeString();
    expect(data.data.name).toBeString();
  });
});

describe("spaces", () => {
  test("/spaces returns paginated items with meta", async () => {
    const data = await apiPost("/spaces", { limit: 5 });
    expect(data.data.items).toBeArray();
    expect(data.data.items.length).toBeGreaterThan(0);
    expect(data.data.meta).toBeDefined();

    const space = data.data.items[0];
    expect(space.id).toBeString();
    expect(space.name).toBeString();
  });
});

describe("groups", () => {
  test("/groups returns paginated items with meta", async () => {
    const data = await apiPost("/groups", { limit: 5 });
    expect(data.data.items).toBeArray();
    expect(data.data.meta).toBeDefined();
  });
});

describe("pagination", () => {
  test("cursor-based pagination returns unique results across pages", async () => {
    const page1 = await apiPost("/pages/recent", { limit: 2 });
    const cursor = page1.data.meta.nextCursor;
    expect(cursor).toBeString();

    const page2 = await apiPost("/pages/recent", { limit: 2, cursor });
    const ids1 = page1.data.items.map((i: any) => i.id);
    const ids2 = page2.data.items.map((i: any) => i.id);
    const overlap = ids1.filter((id: string) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });
});

describe("create → move → delete lifecycle", () => {
  test("create page, move it, then delete it", async () => {
    const t = await getAuthToken();

    // Get a space to create in
    const spaces = await apiPost("/spaces", { limit: 1 });
    const spaceId = spaces.data.items[0].id;

    // Get existing page to use as move target
    const pages = await apiPost("/pages/recent", { limit: 1 });
    const parentPageId = pages.data.items[0].id;

    // 1. CREATE via /pages/import (multipart form)
    const boundary = "----TestBoundary" + Date.now();
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="spaceId"\r\n\r\n${spaceId}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test-page.md"\r\n` +
      `Content-Type: text/markdown\r\n\r\n# TDD Test Page\n\nThis page was created by automated test.\r\n` +
      `--${boundary}--\r\n`;

    const createRes = await fetch(`${baseUrl}/pages/import`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${t}`,
      },
      body,
    });
    const createData = await createRes.json();

    expect(createRes.status).toBe(200);
    expect(createData.data.id).toBeString();
    const newPageId = createData.data.id;

    // 2. MOVE to parent
    const moveData = await apiPost("/pages/move", {
      pageId: newPageId,
      parentPageId,
      position: "a00000",
    });
    expect(moveData.success).toBe(true);

    // Verify page now has correct parent
    const movedPage = await apiPost("/pages/info", { pageId: newPageId });
    expect(movedPage.data.parentPageId).toBe(parentPageId);

    // 3. DELETE
    const deleteData = await apiPost("/pages/delete", { pageId: newPageId });
    expect(deleteData.success).toBe(true);
  });
});

describe("pages", () => {
  test("/pages/recent returns paginated items", async () => {
    const data = await apiPost("/pages/recent", { limit: 5 });
    expect(data.data.items).toBeArray();
    expect(data.data.items.length).toBeGreaterThan(0);
    expect(data.data.meta).toBeDefined();

    const page = data.data.items[0];
    expect(page.id).toBeString();
    expect(page.title).toBeString();
  });

  test("/pages/info returns page data", async () => {
    const listData = await apiPost("/pages/recent", { limit: 1 });
    const pageId = listData.data.items[0].id;

    const data = await apiPost("/pages/info", { pageId });
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(pageId);
    expect(data.data.title).toBeString();
    expect(data.data.spaceId).toBeString();
  });
});
