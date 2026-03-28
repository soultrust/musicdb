import type { ChangeEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSearchState } from "./useSearchState";

describe("useSearchState", () => {
  it("initializes with expected defaults", () => {
    const { result } = renderHook(() => useSearchState());
    expect(result.current.query).toBe("");
    expect(result.current.searchType).toBe("album");
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("allowDigitsOnly strips non-digits and enforces max length", () => {
    const { result } = renderHook(() => useSearchState());

    act(() => {
      result.current.allowDigitsOnly(result.current.setFilterYear)({
        target: { value: "20ab2-12345" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.filterYear).toBe("2021");

    act(() => {
      result.current.allowDigitsOnly(result.current.setFilterYearFrom, 2)({
        target: { value: "9x87" },
      } as unknown as ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.filterYearFrom).toBe("98");
  });
});

