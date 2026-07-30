import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  StudentLoginRequest,
  User,
} from '@/types';

export const authService = {
  /** Email + password — CSC Admin, School Admin, Teacher. */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('auth/login/', payload);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  },

  /** Student ID + password — students only. Separate endpoint from login(). */
  async studentLogin(payload: StudentLoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('auth/student/login/', payload);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  },

  async register(payload: RegisterRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('auth/register/', payload);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  },

  async logout(): Promise<void> {
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refresh) {
        await api.post('auth/logout/', { refresh });
      }
    } catch {
      // Best-effort; clear local state regardless.
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('auth/me/');
    return data;
  },

  async updateProfile(payload: Partial<User>): Promise<User> {
    const { data } = await api.put<User>('auth/me/', payload);
    return data;
  },

  /**
   * Upload the current user's profile photo (JPG/JPEG/PNG, max 5MB). Sent as multipart
   * to a PATCH on /auth/me/ so nothing else on the profile is touched. The backend
   * re-validates size and type; the returned user carries the new `profile_photo_url`.
   */
  async uploadProfilePhoto(file: File): Promise<User> {
    const form = new FormData();
    form.append('profile_photo', file);
    const { data } = await api.patch<User>('auth/me/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async googleLogin(idToken: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('auth/google/', { id_token: idToken });
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('auth/password/reset/', { email });
  },

  /**
   * Students don't sign in with an email, so they reset by Student ID. The backend resolves
   * it to that student's own registered email and sends the link there — never to the
   * school's official email.
   */
  async requestStudentPasswordReset(studentId: string): Promise<void> {
    await api.post('auth/password/reset/student/', { student_id: studentId });
  },

  async confirmPasswordReset(uid: string, token: string, newPassword: string): Promise<void> {
    await api.post('auth/password/confirm/', { uid, token, new_password: newPassword });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('auth/password/change/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  async setupPassword(uid: string, token: string, newPassword: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('auth/password/setup/', {
      uid,
      token,
      new_password: newPassword,
    });
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    return data;
  },
};
