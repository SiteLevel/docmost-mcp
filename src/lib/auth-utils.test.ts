import { describe, test, expect, mock, beforeEach } from "bun:test";
import axios from "axios";
import { performLogin } from "./auth-utils.js";
import * as authUtils from "./auth-utils.js";

mock.module("axios", () => ({
  default: {
    post: mock(),
    isAxiosError: (e: any) => e?.isAxiosError === true,
  },
}));

const mockedPost = axios.post as ReturnType<typeof mock>;

beforeEach(() => {
  mockedPost.mockReset();
});

describe("performLogin", () => {
  test("returns accessToken from JSON response body", async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          tokens: { accessToken: "test-token-123" },
        },
      },
    });

    const token = await performLogin("http://localhost:3000", "a@b.com", "pw");
    expect(token).toBe("test-token-123");
    expect(mockedPost).toHaveBeenCalledWith("http://localhost:3000/auth/login", {
      email: "a@b.com",
      password: "pw",
    });
  });

  test("does not export getCollabToken", () => {
    expect("getCollabToken" in authUtils).toBe(false);
  });

  test("throws when response has no tokens", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { data: {} },
    });

    expect(
      performLogin("http://localhost:3000", "a@b.com", "pw"),
    ).rejects.toThrow("No accessToken found in login response");
  });
});
