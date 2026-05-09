import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import App from './App.tsx';
import { registerServiceWorker } from '@/utils/pwa';

dayjs.extend(utc);
dayjs.extend(tz);
// Set default timezone to Vietnam (GMT+7)
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);