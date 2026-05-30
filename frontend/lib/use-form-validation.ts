'use client';

import { useState, useCallback, useRef } from 'react';

export interface ValidationRule {
  key: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  validate?: (value: string) => string | null;
}

export interface FieldErrors {
  [key: string]: string | null;
}

export function useFormValidation(rules: ValidationRule[]) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const validateField = useCallback((key: string, value: string): string | null => {
    const rule = rules.find(r => r.key === key);
    if (!rule) return null;

    const trimmed = value.trim();

    if (rule.required && !trimmed) {
      return `${rule.label} is required`;
    }
    if (rule.minLength && trimmed.length < rule.minLength) {
      return `${rule.label} must be at least ${rule.minLength} characters`;
    }
    if (rule.maxLength && trimmed.length > rule.maxLength) {
      return `${rule.label} must be at most ${rule.maxLength} characters`;
    }
    if (rule.pattern && trimmed && !rule.pattern.test(trimmed)) {
      return rule.patternMessage || `Invalid ${rule.label.toLowerCase()}`;
    }
    if (rule.validate && trimmed) {
      return rule.validate(trimmed);
    }
    return null;
  }, [rules]);

  const validateAll = useCallback((values: Record<string, string>): boolean => {
    const newErrors: FieldErrors = {};
    let valid = true;
    for (const rule of rules) {
      const error = validateField(rule.key, values[rule.key] || '');
      if (error) {
        newErrors[rule.key] = error;
        valid = false;
      } else {
        newErrors[rule.key] = null;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [rules, validateField]);

  const handleChange = useCallback((key: string, value: string) => {
    if (touched.has(key)) {
      const error = validateField(key, value);
      setErrors(prev => ({ ...prev, [key]: error }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((key: string, value: string) => {
    setTouched(prev => new Set(prev).add(key));
    const error = validateField(key, value);
    setErrors(prev => ({ ...prev, [key]: error }));
  }, [validateField]);

  const handleSubmit = useCallback(async (
    values: Record<string, string>,
    submitFn: () => Promise<void>
  ): Promise<boolean> => {
    if (submitLockRef.current) return false;
    const allTouched = new Set(rules.map(r => r.key));
    setTouched(allTouched);

    if (!validateAll(values)) return false;

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await submitFn();
      return true;
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }, [rules, validateAll]);

  const reset = useCallback(() => {
    setErrors({});
    setTouched(new Set());
    setSubmitting(false);
    submitLockRef.current = false;
  }, []);

  return {
    errors,
    touched,
    submitting,
    validateField,
    validateAll,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
