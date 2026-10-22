import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './app.css';

import { Toaster } from 'sonner';
import { ConfirmProvider } from './contexts/ConfirmContext';

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ConfirmProvider>
                <App />
                <Toaster position="top-right" richColors />
            </ConfirmProvider>
        </BrowserRouter>
    </React.StrictMode>
);
