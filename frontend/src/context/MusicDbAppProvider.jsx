import { MusicDbAppContext } from "./musicDbAppContext";

export function MusicDbAppProvider({ value, children }) {
  return <MusicDbAppContext.Provider value={value}>{children}</MusicDbAppContext.Provider>;
}
