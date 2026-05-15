import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { QRApp } from './qr-ordering/App';
import { CartProvider } from './qr-ordering/context/CartContext';
import './qr-ordering/styles/index.css';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <QRApp />
        <ToastContainer
          position="top-center"
          autoClose={2200}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          pauseOnHover={false}
          theme="colored"
        />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
