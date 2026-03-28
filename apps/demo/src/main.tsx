import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';
import { DemoSelfHealProvider } from './self-heal/provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoSelfHealProvider>
      <App />
    </DemoSelfHealProvider>
  </React.StrictMode>
);
