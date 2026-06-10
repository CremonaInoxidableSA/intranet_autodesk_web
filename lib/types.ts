export interface User {
  id: number;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  rol: "superadmin" | "admin" | "user";
  habilitado: boolean;
  reporte: boolean;
}

export interface UserSession {
  id: number;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  rol: "superadmin" | "admin" | "user";
  habilitado: boolean;
  reporte: boolean;
}

export interface ConfigParam {
  id: number;
  param_name: string;
  param_value: string;
  description?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
