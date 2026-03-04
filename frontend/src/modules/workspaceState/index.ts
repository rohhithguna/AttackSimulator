import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkspaceTab {
  id: string;
  title: string;
  active: boolean;
  type: 'simulator' | 'dashboard' | 'reports';
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  addTab: (tab: Omit<WorkspaceTab, 'active'>) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      tabs: [
        { id: '1', title: 'Main Simulation', active: true, type: 'simulator' },
        { id: '2', title: 'Network Analysis', active: false, type: 'simulator' },
      ],
      activeTabId: '1',
      addTab: (tab) =>
        set((state) => {
          const newTab = { ...tab, active: true };
          return {
            tabs: [...state.tabs.map((t) => ({ ...t, active: false })), newTab],
            activeTabId: tab.id,
          };
        }),
      removeTab: (id) =>
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === id) {
            newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null;
            if (newActiveTabId) {
              newTabs[0].active = true;
            }
          }
          return { tabs: newTabs, activeTabId: newActiveTabId };
        }),
      setActiveTab: (id) =>
        set((state) => ({
          tabs: state.tabs.map((t) => ({ ...t, active: t.id === id })),
          activeTabId: id,
        })),
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'attack-simulator-workspace-v1',
    }
  )
);
