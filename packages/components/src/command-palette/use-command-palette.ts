import { useCallback, useState } from "react";
import type { Command, CommandGroup } from "./types";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setQuery(""); // reset on close
  }, []);

  return { open, setOpen, query, setQuery };
}
