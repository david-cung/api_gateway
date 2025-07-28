export const USER_PATTERNS = {
  CREATE: 'user_create',
  GET_BY_ID: 'user_get_by_id',
  GET_BY_EMAIL: 'user_get_by_email',
  UPDATE: 'user_update',
  DELETE: 'user_delete',
  LIST: 'user_list',
  SEARCH: 'user_search',
} as const;

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}