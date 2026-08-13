jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: { marker: "test-auth-options" },
}));

import NextAuth from "next-auth";
import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("NextAuth route", () => {
  it("configures one handler for both supported HTTP methods", () => {
    expect(NextAuth).toHaveBeenCalledTimes(1);
    expect(NextAuth).toHaveBeenCalledWith({ marker: "test-auth-options" });
    expect(GET).toEqual(expect.any(Function));
    expect(POST).toBe(GET);
  });
});
