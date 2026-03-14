import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet');
      return res.data.wallet;
    }
  });
}
