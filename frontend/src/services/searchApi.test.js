import { describe, expect, it } from "vitest";
import {
  albumOverviewUrl,
  detailUrl,
  listItemsCheckUrl,
  listsIndexUrl,
  searchQueryUrl,
} from "./searchApi";

describe("searchApi URL builders", () => {
  const API_BASE = "http://localhost:8000";

  it("builds search URL with encoded query params", () => {
    const url = searchQueryUrl(API_BASE, { q: "Miles Davis", type: "album" });
    expect(url).toContain("/api/search/?");
    expect(url).toContain("q=Miles+Davis");
    expect(url).toContain("type=album");
  });

  it("builds detail URL with encoded type and id", () => {
    const url = detailUrl(API_BASE, "release", "1111-2222");
    expect(url).toBe(
      "http://localhost:8000/api/search/detail/?type=release&id=1111-2222",
    );
  });

  it("builds album overview URL with encoded album/artist", () => {
    const url = albumOverviewUrl(API_BASE, "Kind of Blue", "Miles Davis");
    expect(url).toBe(
      "http://localhost:8000/api/search/album-overview/?album=Kind%20of%20Blue&artist=Miles%20Davis",
    );
  });

  it("returns lists index root when listType is missing", () => {
    expect(listsIndexUrl(API_BASE)).toBe("http://localhost:8000/api/search/lists/");
    expect(listsIndexUrl(API_BASE, "")).toBe("http://localhost:8000/api/search/lists/");
  });

  it("adds list_type filter when provided", () => {
    expect(listsIndexUrl(API_BASE, "release")).toBe(
      "http://localhost:8000/api/search/lists/?list_type=release",
    );
  });

  it("builds list item check URL with encoded values", () => {
    const url = listItemsCheckUrl(API_BASE, "album", "id with space");
    expect(url).toBe(
      "http://localhost:8000/api/search/lists/items/check/?type=album&id=id%20with%20space",
    );
  });
});

