import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { store } from './app/store';
import './styles.css';
import projectLogo from './assets/project-logo.svg';

const faviconLink =
  document.querySelector("link[rel~='icon']") ?? document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.type = 'image/svg+xml';
faviconLink.href = projectLogo;
if (!faviconLink.parentNode) {
  document.head.appendChild(faviconLink);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
