// ============================================================
// App — ErrorBoundary + RouterProvider
// ============================================================

import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { router } from './router';

/** Radice React che protegge il router con il boundary globale degli errori. */
function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
