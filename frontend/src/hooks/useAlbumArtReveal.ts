import { useEffect } from "react";

/** After detail load completes, reveal album art on the next frame (avoids flash). */
export function useAlbumArtReveal(detailData, detailLoading, setAlbumArtReady) {
  useEffect(() => {
    if (!detailData || detailLoading) return;
    const id = requestAnimationFrame(() => setAlbumArtReady(true));
    return () => cancelAnimationFrame(id);
  }, [detailData, detailLoading, setAlbumArtReady]);
}
