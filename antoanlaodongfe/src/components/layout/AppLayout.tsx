import { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import TabBar from './TabBar';
import Breadcrumb from '@/components/common/Breadcrumb';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header: TopBar + Sidebar/Nav ngang */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar }}>
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <TabBar />
      </Box>

      {/* Main content — thêm padding-bottom để không bị TabBar che */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          bgcolor: 'background.default',
          minHeight: '100vh',
          pb: 7,  // chừa chỗ cho TabBar ở dưới (height ~56px)
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Breadcrumb />
          <Outlet />
        </Box>
      </Box>

      {/* Thanh tab ở cuối màn hình */}

    </Box>
  );
}
