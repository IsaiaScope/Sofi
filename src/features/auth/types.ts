export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}
