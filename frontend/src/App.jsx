import "./App.css";
import AuthGate from "./components/AuthGate";
import AppHeader from "./components/AppHeader";
import ListModal from "./components/ListModal";
import SpotifySearchModal from "./components/SpotifySearchModal";
import UnmatchSpotifyConfirmModal from "./components/UnmatchSpotifyConfirmModal";
import SearchSidebar from "./components/SearchSidebar";
import PlaylistDetail from "./components/PlaylistDetail";
import SelectedItemDetail from "./components/SelectedItemDetail";
import { useMusicDbAppState } from "./hooks/useMusicDbAppState";
import { MusicDbAppProvider } from "./context/MusicDbAppProvider";
import { API_BASE, AUTH_REFRESH_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from "./config";

function App() {
  const {
    accessToken,
    authMode,
    authEmail,
    authPassword,
    authLoading,
    authError,
    setAuthEmail,
    setAuthPassword,
    setAuthError,
    setAuthMode,
    handleAuthSubmit,
    musicDbAppSlices,
    showListModal,
    showSpotifySearchModal,
    manualMatchTrackTitle,
    unmatchSpotifyTrackTitle,
    closeUnmatchSpotifyConfirm,
    confirmUnmatchSpotify,
    unmatchSpotifyLoading,
    selectedPlaylistId,
    playlistTracksData,
    selectedItem,
  } = useMusicDbAppState({
    API_BASE,
    AUTH_REFRESH_KEY,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT_URI,
  });

  if (!accessToken) {
    return (
      <AuthGate
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authLoading={authLoading}
        authError={authError}
        onSubmit={handleAuthSubmit}
        onChangeEmail={(e) => setAuthEmail(e.target.value)}
        onChangePassword={(e) => setAuthPassword(e.target.value)}
        onToggleAuthMode={() => {
          setAuthMode((m) => (m === "login" ? "register" : "login"));
          setAuthError(null);
        }}
      />
    );
  }

  return (
    <MusicDbAppProvider slices={musicDbAppSlices}>
      <div className="app">
        <AppHeader />
        <div className="content">
          <SearchSidebar />
          {selectedPlaylistId && playlistTracksData ? (
            <PlaylistDetail />
          ) : (
            selectedItem && <SelectedItemDetail />
          )}
        </div>
        {showListModal && <ListModal />}
        {showSpotifySearchModal && (
          <SpotifySearchModal key={manualMatchTrackTitle ?? "spotify-search-modal"} />
        )}
        {unmatchSpotifyTrackTitle != null && (
          <UnmatchSpotifyConfirmModal
            trackTitle={unmatchSpotifyTrackTitle}
            loading={unmatchSpotifyLoading}
            onCancel={closeUnmatchSpotifyConfirm}
            onConfirm={confirmUnmatchSpotify}
          />
        )}
      </div>
    </MusicDbAppProvider>
  );
}

export default App;
