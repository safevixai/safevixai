// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { ValidationRule } from './use-form-validation';

export const EMAIL_RULE: ValidationRule = {
  key: 'email',
  label: 'Email',
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  patternMessage: 'Invalid email address',
};

export const PASSWORD_RULE: ValidationRule = {
  key: 'password',
  label: 'Password',
  required: true,
  minLength: 8,
  patternMessage: 'Minimum 8 characters',
};

export const NAME_RULE: ValidationRule = {
  key: 'name',
  label: 'Full Name',
  required: true,
  minLength: 2,
};

export const LOGIN_RULES: ValidationRule[] = [
  EMAIL_RULE,
  { ...PASSWORD_RULE, minLength: 1 }, // Password only needs 1+ characters for login
];

export const SIGNUP_RULES = (passwordVal: string): ValidationRule[] => [
  NAME_RULE,
  EMAIL_RULE,
  PASSWORD_RULE,
  {
    key: 'confirmPassword',
    label: 'Confirm Password',
    required: true,
    validate: (val: string) => val !== passwordVal ? 'Passwords do not match' : null,
  },
];

export const RESET_RULES: ValidationRule[] = [
  EMAIL_RULE,
];
