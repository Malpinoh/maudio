
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { registerDeviceStorage } from '@shared/core/storage/StorageManager';
import { capacitorDeviceStorage } from '@mobile';
import App from './web/App.tsx';
import './web/index.css';

// Mobile Client capability registration (no-ops in a plain browser).
registerDeviceStorage(capacitorDeviceStorage);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
