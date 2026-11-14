import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useResource } from "./useResource";

describe("useResource", () => {
  it("accepts responses after React StrictMode remounts effects", async () => {
    const { result } = renderHook(
      () => useResource(async () => ({ name: "Updated Player" }), []),
      { wrapper: React.StrictMode },
    );

    await waitFor(() => expect(result.current.data).toEqual({ name: "Updated Player" }));
  });

  it("keeps the previous value when a reload fails", async () => {
    let mode = "ok";
    const { result } = renderHook(() =>
      useResource(async () => {
        if (mode === "fail") throw Object.assign(new Error("boom"), { status: 500 });
        return { value: 7 };
      }, []),
    );

    await waitFor(() => expect(result.current.data).toEqual({ value: 7 }));
    expect(result.current.error).toBeNull();

    mode = "fail";
    await act(async () => {
      result.current.reload();
    });

    // Data survives the failure; only the error flag is set.
    expect(result.current.data).toEqual({ value: 7 });
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it("recovers on a later successful reload", async () => {
    let mode = "fail";
    const { result } = renderHook(() =>
      useResource(async () => {
        if (mode === "fail") throw Object.assign(new Error("boom"), { status: 500 });
        return { value: 42 };
      }, []),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data).toBeUndefined();

    mode = "ok";
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.data).toEqual({ value: 42 }));
    expect(result.current.error).toBeNull();
  });

  it("does not auto-retry non-transient failures such as 404", async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useResource(async () => {
        calls += 1;
        throw Object.assign(new Error("missing"), { status: 404 });
      }, []),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(calls).toBe(1);
  });

  it("auto-retries transient network failures", async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useResource(async () => {
        calls += 1;
        if (calls < 3) throw new TypeError("Failed to fetch");
        return "recovered";
      }, []),
    );

    await waitFor(() => expect(result.current.data).toBe("recovered"), { timeout: 4000 });
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(result.current.error).toBeNull();
  });

  it("ignores a stale response that resolves after a newer one", async () => {
    const resolvers = [];
    const { result } = renderHook(() =>
      useResource(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
        [],
      ),
    );

    await act(async () => {
      resolvers[0]("first");
    });
    expect(result.current.data).toBe("first");

    // Start a second request, then let an old one settle late.
    await act(async () => {
      result.current.reload();
    });
    await act(async () => {
      resolvers[1]("second");
    });
    expect(result.current.data).toBe("second");
  });
});
