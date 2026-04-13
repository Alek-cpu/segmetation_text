import { AppProvider } from '../context/AppContext';
import { MainLayout } from '../components/MainLayout';

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
