import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { DetailData } from "../types/musicDbSlices";

/** After detail load completes, reveal album art on the next frame (avoids flash). */
export function useAlbumArtReveal(
  detailData: DetailData | null,
  detailLoading: boolean,
  setAlbumArtReady: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!detailData || detailLoading) return;
    const id = requestAnimationFrame(() => setAlbumArtReady(true));
    return () => cancelAnimationFrame(id);
  }, [detailData, detailLoading, setAlbumArtReady]);
}
