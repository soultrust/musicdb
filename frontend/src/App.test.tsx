import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MusicDbAppSlices } from "./context/musicDbSliceContexts";
import App from "./App";
import { useMusicDbAppState } from "./hooks/useMusicDbAppState";

vi.mock("./hooks/useMusicDbAppState");

vi.mock("./components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));
vi.mock("./components/SearchSidebar", () => ({
  default: () => <div data-testid="search-sidebar" />,
}));
vi.mock("./components/PlaylistDetail", () => ({
  default: () => <div data-testid="playlist-detail" />,
}));
vi.mock("./components/SelectedItemDetail", () => ({
  default: () => <div data-testid="selected-item-detail" />,
}));
vi.mock("./components/ListModal", () => ({
  default: () => <div data-testid="list-modal" />,
}));
vi.mock("./components/SpotifySearchModal", () => ({
  default: () => <div data-testid="spotify-search-modal" />,
}));

const emptySlices = {} as unknown as MusicDbAppSlices;

function authenticatedState(overrides: Partial<ReturnType<typeof useMusicDbAppState>> = {}) {
  return {
    accessToken: "jwt-token",
    authMode: "login" as const,
    authEmail: "",
    authPassword: "",
    authLoading: false,
    authError: null,
    setAuthEmail: vi.fn(),
    setAuthPassword: vi.fn(),
    setAuthError: vi.fn(),
    setAuthMode: vi.fn(),
    handleAuthSubmit: vi.fn(),
    musicDbAppSlices: emptySlices,
    showListModal: false,
    showSpotifySearchModal: false,
    manualMatchTrackTitle: null,
    unmatchSpotifyTrackTitle: null,
    closeUnmatchSpotifyConfirm: vi.fn(),
    confirmUnmatchSpotify: vi.fn(),
    unmatchSpotifyLoading: false,
    selectedPlaylistId: null,
    playlistTracksData: null,
    selectedItem: null,
    ...overrides,
  } satisfies ReturnType<typeof useMusicDbAppState>;
}

describe("App", () => {
  beforeEach(() => {
    vi.mocked(useMusicDbAppState).mockReset();
  });

  it("renders AuthGate when not authenticated", () => {
    vi.mocked(useMusicDbAppState).mockReturnValue({
      ...authenticatedState(),
      accessToken: null,
    });

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "MusicDB" })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to search and manage your music lists/i)).toBeInTheDocument();
    expect(screen.queryByTestId("app-header")).not.toBeInTheDocument();
  });

  it("renders main shell when authenticated", () => {
    vi.mocked(useMusicDbAppState).mockReturnValue(authenticatedState());

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("search-sidebar")).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to search and manage your music lists/i)).not.toBeInTheDocument();
  });

  it("shows playlist detail when a Spotify playlist is selected", () => {
    vi.mocked(useMusicDbAppState).mockReturnValue(
      authenticatedState({
        selectedPlaylistId: "p1",
        playlistTracksData: { id: "p1", tracks: [] },
        selectedItem: { id: "rel-1", type: "release", title: "R" },
      }),
    );

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByTestId("playlist-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("selected-item-detail")).not.toBeInTheDocument();
  });

  it("shows selected item detail when no playlist view is active", () => {
    vi.mocked(useMusicDbAppState).mockReturnValue(
      authenticatedState({
        selectedItem: { id: "rel-1", type: "release", title: "R" },
      }),
    );

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByTestId("selected-item-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("playlist-detail")).not.toBeInTheDocument();
  });

  it("renders modals when flags are set", () => {
    vi.mocked(useMusicDbAppState).mockReturnValue(
      authenticatedState({
        showListModal: true,
        showSpotifySearchModal: true,
        manualMatchTrackTitle: "Track A",
        unmatchSpotifyTrackTitle: "Track B",
      }),
    );

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByTestId("list-modal")).toBeInTheDocument();
    expect(screen.getByTestId("spotify-search-modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove match/i })).toBeInTheDocument();
  });
});
