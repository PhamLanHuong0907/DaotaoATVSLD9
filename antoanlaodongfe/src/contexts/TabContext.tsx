import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export interface AppTab {
  id: string;
  path: string;
  title: string;
  icon?: string;
}
interface TabContextValue {
  tabs: AppTab[];
  activeTabId: string | null;
  openTab: (tab: Omit<AppTab, 'id'>) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function useTabContext() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabContext must be used within TabProvider');
  return ctx;
}

interface TabProviderProps {
  children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [tabs, setTabs] = useState<AppTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // 1. Cập nhật activeTabId dựa trên URL hiện tại
  // Tìm tab nào có ID là phần đầu của URL hiện tại
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = tabs.find(t => currentPath.startsWith(t.id));
    if (matchingTab) {
      setActiveTabId(matchingTab.id);

      // 2. QUAN TRỌNG: Cập nhật lại 'path' mới nhất cho tab đó
      // Để khi quay lại tab này, nó sẽ dẫn đến URL chi tiết nhất
      setTabs(prev => prev.map(t =>
        t.id === matchingTab.id ? { ...t, path: currentPath } : t
      ));
    }
  }, [location.pathname, tabs.length]); // Chạy khi đổi URL hoặc thêm/xóa tab

  const openTab = useCallback((tab: Omit<AppTab, 'id'>) => {
    // Chúng ta lấy path gốc làm ID (ví dụ: /admin/courses)
    // để các trang chi tiết vẫn thuộc về tab "Khóa học" này
    const id = tab.path;

    setTabs((prev) => {
      const existingTab = prev.find((t) => t.id === id);
      if (existingTab) return prev;
      return [...prev, { ...tab, id }];
    });

    setActiveTabId(id);
    navigate(tab.path);
  }, [navigate]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);

      if (id === activeTabId && next.length > 0) {
        const newActive = next[Math.max(0, idx - 1)];
        setActiveTabId(newActive.id);
        navigate(newActive.path); // Quay về path cuối cùng được ghi nhớ của tab kề
      } else if (next.length === 0) {
        setActiveTabId(null);
        navigate('/dashboard'); // Hoặc trang mặc định khi hết tab
      }
      return next;
    });
  }, [activeTabId, navigate]);

  const switchTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      setActiveTabId(id);
      navigate(tab.path); // Chuyển đến path cuối cùng được ghi nhớ
    }
  }, [tabs, navigate]);

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, switchTab }}>
      {children}
    </TabContext.Provider>
  );
}
