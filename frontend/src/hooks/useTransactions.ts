import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data.transactions;
    }
  });
}
