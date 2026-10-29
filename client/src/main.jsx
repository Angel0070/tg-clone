import React from 'react'; import { createRoot } from 'react-dom/client';
import App from './App.jsx'; import { applyPrefs } from './prefs.js'; import './styles.css';
applyPrefs();
createRoot(document.getElementById('root')).render(<App />);
