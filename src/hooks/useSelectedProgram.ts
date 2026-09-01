import { useState, useCallback } from "react";
import { ProgramSearchResult } from "../types/timetable";
import { StorageService } from "../services/storage";

export function useSelectedProgram() {
  const [selectedProgram, setSelectedProgramState] = useState<ProgramSearchResult>(() =>
    StorageService.getSelectedProgram()
  );
  const [recents, setRecents] = useState<ProgramSearchResult[]>(() =>
    StorageService.getRecentPrograms()
  );

  const selectProgram = useCallback((program: ProgramSearchResult) => {
    setSelectedProgramState(program);
    StorageService.setSelectedProgram(program);
    setRecents(StorageService.getRecentPrograms());
  }, []);

  return {
    selectedProgram,
    selectProgram,
    recents,
  };
}
