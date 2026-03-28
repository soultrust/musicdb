export default function UnmatchSpotifyConfirmModal({
  trackTitle,
  loading,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Remove manual match?</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="unmatch-spotify-confirm-text">
            Remove your saved Spotify match for <strong>{trackTitle}</strong>? Automatic matching
            will apply again for this track.
          </p>
          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="unmatch-spotify-confirm-remove"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Removing…" : "Remove match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
