import { create } from "zustand";
import { today } from "@/domain/jalali";

interface UiState {
  selectedYear: number;
  selectedMonth: number;
  setSelectedYearMonth: (year: number, month: number) => void;
}

const now = today();

export const useUiStore = create<UiState>((set) => ({
  selectedYear: now.year,
  selectedMonth: now.month,
  setSelectedYearMonth: (year, month) => set({ selectedYear: year, selectedMonth: month }),
}));
