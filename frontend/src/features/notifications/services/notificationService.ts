import { apiClient } from '@/services/apiClient';
import type { Notification } from '../types/notification';

export const notificationService = {
  async getAll(params?: {
    is_read?: boolean;
    notification_type?: string;
    limit?: number;
    skip?: number;
  }): Promise<Notification[]> {
    const searchParams = new URLSearchParams();
    if (params?.is_read !== undefined) searchParams.append('is_read', params.is_read.toString());
    if (params?.notification_type) searchParams.append('notification_type', params.notification_type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    const query = searchParams.toString();
    return apiClient.get<Notification[]>(`/notifications${query ? `?${query}` : ''}`);
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>('/notifications/unread-count');
  },

  async markAsRead(notificationId: string): Promise<void> {
    return apiClient.patch<void>(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    return apiClient.patch<void>('/notifications/read-all');
  },

  async delete(notificationId: string): Promise<void> {
    return apiClient.delete<void>(`/notifications/${notificationId}`);
  },

  async clearAll(): Promise<void> {
    return apiClient.delete<void>('/notifications/');
  },
};
