export type ThemeOption = 'light' | 'dark' | 'system';

export interface SettingsFormData {
  name: string;
  email: string;
  defaultModel: string;
  creativity: number;
  autoSuggestions: boolean;
  theme: ThemeOption;
  emailAlerts: boolean;
  weeklyReports: boolean;
  twoFactorEnabled: boolean;
}

export interface ValidationErrors {
  name?: string;
  email?: string;
}
