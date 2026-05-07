import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorToastProvider } from './components/ErrorToastProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorToastProvider>
      <App />
    </ErrorToastProvider>
  </StrictMode>
);
