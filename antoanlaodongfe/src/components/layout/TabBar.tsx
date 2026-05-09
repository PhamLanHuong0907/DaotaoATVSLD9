import { useTabContext } from '@/contexts/TabContext';
import { Box, IconButton, Tooltip, Typography, useTheme, alpha } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export default function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = useTabContext();
  const theme = useTheme();

  if (tabs.length === 0) return null;

  return (
    <Box
      component="nav"
      aria-label="Thanh tab đang mở"
      sx={{
        zIndex: theme.zIndex.appBar - 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid', // Sửa thành borderBottom vì tab đang nằm trên cùng
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        overflowX: 'auto',
        px: 2, // Tăng khoảng cách 2 bên để thanh thoát hơn
        py: 1, // Tăng chiều cao để không bị bí bách
        gap: 1, // Khoảng cách giữa các tab thoải mái hơn
        // Thanh cuộn làm tinh tế lại
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        minHeight: 48,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)', // Đổi bóng hắt xuống dưới thật nhẹ
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <Box
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: '8px', // Bo góc mềm mại
              cursor: 'pointer',
              flexShrink: 0,
              maxWidth: 240,
              minWidth: 120, // Đảm bảo tab không bị quá nhỏ khi có ít chữ

              // 💅 Hiệu ứng Soft Pill: Nền trong suốt pha màu cho tab active
              bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: isActive ? 'primary.main' : 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

              '&:hover': {
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : 'action.hover',
                color: isActive ? 'primary.main' : 'text.primary',
              },
            }}
          >
            {tab.icon && (
              <Typography variant="caption" sx={{ fontSize: 16, lineHeight: 1 }}>
                {tab.icon}
              </Typography>
            )}

            <Typography
              variant="subtitle2"
              fontWeight={isActive ? 600 : 500} // Chữ tab active đậm vừa phải
              noWrap
              sx={{ flex: 1, color: 'inherit', fontSize: '0.85rem' }}
            >
              {tab.title}
            </Typography>

            <Tooltip title="Đóng tab">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                sx={{
                  p: 0.25,
                  color: 'inherit',
                  opacity: isActive ? 0.8 : 0.4, // Giảm độ đậm của nút X khi không focus
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    opacity: 1,
                    // Nút X khi hover sẽ có background tròn tinh tế
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.2) : 'action.selected'
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      })}
    </Box>
  );
}