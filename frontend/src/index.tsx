import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { EventSourceProvider } from './hooks/useEventSource';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <EventSourceProvider>
      <App />
    </EventSourceProvider>
  </React.StrictMode>
); 