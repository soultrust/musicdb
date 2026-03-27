import { useContext } from "react";
import { MusicDbAppContext } from "../context/musicDbAppContext";

export function useMusicDbApp() {
  const ctx = useContext(MusicDbAppContext);
  if (ctx == null) {
    throw new Error("useMusicDbApp must be used within MusicDbAppProvider");
  }
  return ctx;
}
