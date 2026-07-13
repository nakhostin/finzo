import { create } from "zustand";
import { today } from "@/domain/jalali";

interface UiState {
  selectedYear: number;
  selectedMonth: number;
  setSelectedYearMonth: (year: number, month: number) => void;
  /** When true, add-forms stay open after saving so several items can be entered in a row. */
  keepFormOpen: boolean;
  setKeepFormOpen: (value: boolean) => void;
}

const now = today();

export const useUiStore = create<UiState>((set) => ({
  selectedYear: now.year,
  selectedMonth: now.month,
  setSelectedYearMonth: (year, month) => set({ selectedYear: year, selectedMonth: month }),
  keepFormOpen: false,
  setKeepFormOpen: (value) => set({ keepFormOpen: value }),
}));
