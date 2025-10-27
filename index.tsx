import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runTests } from './tests';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Run tests if query param is present
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('run_tests')) {
      console.log("Running test suite...");
      runTests();
  }
} catch (e) {
    console.error("Could not run tests:", e);
}
