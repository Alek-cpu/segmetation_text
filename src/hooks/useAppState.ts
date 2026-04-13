import { useAppContext } from '../context/AppContext';

export function useAppState() {
  return useAppContext();
}
