import api from './api';
import type { Essay } from '@/types';

export const essayService = {
  async getAll(): Promise<Essay[]> {
    const response = await api.get<Essay[]>('/essays');
    return response.data;
  },

  async getById(id: string): Promise<Essay> {
    const response = await api.get<Essay>(`/essays/${id}`);
    return response.data;
  },

  async create(essay: Partial<Essay>): Promise<Essay> {
    const response = await api.post<Essay>('/essays', essay);
    return response.data;
  },

  async update(id: string, essay: Partial<Essay>): Promise<void> {
    await api.put(`/essays/${id}`, essay);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/essays/${id}`);
  }
};
