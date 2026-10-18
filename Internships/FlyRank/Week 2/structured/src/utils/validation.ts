import type { SettingsFormData, ValidationErrors } from '../types/settings';

export const validateSettings = (values: SettingsFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required.';
  } else if (values.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
};

export const isFormValid = (errors: ValidationErrors) => Object.keys(errors).length === 0;
