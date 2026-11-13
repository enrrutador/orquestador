import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FacebookPage } from "@/lib/facebook";

interface PagesState {
  pages: FacebookPage[];
  selectedPageIds: string[];
  activePageId: string | null;
  setPages: (pages: FacebookPage[]) => void;
  togglePage: (pageId: string) => void;
  selectPage: (pageId: string) => void;
  setActivePage: (pageId: string | null) => void;
  clearSelection: () => void;
  isSelected: (pageId: string) => boolean;
}

export const usePagesStore = create<PagesState>()(
  persist(
    (set, get) => ({
      pages: [],
      selectedPageIds: [],
      activePageId: null,

      setPages: (pages) => set({ pages }),

      togglePage: (pageId) => {
        const { selectedPageIds } = get();
        if (selectedPageIds.includes(pageId)) {
          set({
            selectedPageIds: selectedPageIds.filter((id) => id !== pageId),
            activePageId:
              get().activePageId === pageId ? null : get().activePageId,
          });
        } else {
          set({ selectedPageIds: [...selectedPageIds, pageId] });
        }
      },

      selectPage: (pageId) => {
        set({ selectedPageIds: [pageId], activePageId: pageId });
      },

      setActivePage: (pageId) => set({ activePageId: pageId }),

      clearSelection: () => set({ selectedPageIds: [], activePageId: null }),

      isSelected: (pageId) => get().selectedPageIds.includes(pageId),
    }),
    {
      name: "orquestador-pages",
      // Solo persistimos la selección, no los tokens ni datos sensibles
      partialize: (state) => ({
        selectedPageIds: state.selectedPageIds,
        activePageId: state.activePageId,
      }),
    }
  )
);