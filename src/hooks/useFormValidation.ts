import { useState, useCallback, useEffect, useRef } from 'react';
import { z, ZodSchema, ZodError } from 'zod';

export interface ValidationState {
  isValid: boolean;
  error?: string;
  touched: boolean;
  validating: boolean;
  success?: boolean;
}

export interface UseFormValidationOptions<T extends Record<string, unknown>> {
  schema: ZodSchema<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  debounceMs?: number;
  validateOnMount?: boolean;
}

export interface FormValidation<T extends Record<string, unknown>> {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  validating: Partial<Record<keyof T, boolean>>;
  success: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: unknown) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateAll: () => Promise<boolean>;
  getFieldState: (field: keyof T) => ValidationState;
  reset: () => void;
  setIsSubmitting: (submitting: boolean) => void;
}

export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  mode = 'onChange',
  debounceMs = 300,
  validateOnMount = false,
}: UseFormValidationOptions<T>): FormValidation<T> {
  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [validating, setValidating] = useState<Partial<Record<keyof T, boolean>>>({});
  const [success, setSuccess] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateFieldAsync = useCallback(async (field: keyof T, value: unknown): Promise<boolean> => {
    setValidating(prev => ({ ...prev, [field]: true }));
    
    try {
      // Create a partial object for validation
      const partialData = { ...values, [field]: value };
      
      // Try to parse with the full schema to get field-specific errors
      try {
        schema.parse(partialData);
        setErrors(prev => ({ ...prev, [field]: undefined }));
        setSuccess(prev => ({ ...prev, [field]: true }));
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldError = error.errors.find(e => e.path[0] === field);
          if (fieldError) {
            setErrors(prev => ({ ...prev, [field]: fieldError.message }));
            setSuccess(prev => ({ ...prev, [field]: false }));
            return false;
          } else {
            // This field is valid, other fields might have errors
            setErrors(prev => ({ ...prev, [field]: undefined }));
            setSuccess(prev => ({ ...prev, [field]: true }));
            return true;
          }
        }
        throw error;
      }
    } finally {
      setValidating(prev => ({ ...prev, [field]: false }));
    }
  }, [values, schema]);

  // Debounced validation for onChange mode
  const debouncedValidateRef = useRef<ReturnType<typeof setTimeout>>();
  
  const debouncedValidate = useCallback((field: keyof T, value: unknown) => {
    if (debouncedValidateRef.current) {
      clearTimeout(debouncedValidateRef.current);
    }
    debouncedValidateRef.current = setTimeout(() => {
      validateFieldAsync(field, value);
    }, debounceMs);
  }, [validateFieldAsync, debounceMs]);

  const setValue = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (mode === 'onChange' && touched[field]) {
      debouncedValidate(field, value);
    }
  }, [mode, touched, debouncedValidate]);

  const setTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
    
    if (mode === 'onBlur' && isTouched) {
      validateFieldAsync(field, values[field]);
    }
  }, [mode, validateFieldAsync, values]);

  const validateField = useCallback(async (field: keyof T): Promise<boolean> => {
    return validateFieldAsync(field, values[field]);
  }, [validateFieldAsync, values]);

  const validateAll = useCallback(async (): Promise<boolean> => {
    const allFields = Object.keys(values) as (keyof T)[];
    
    try {
      schema.parse(values);
      setErrors({});
      allFields.forEach(field => {
        setSuccess(prev => ({ ...prev, [field]: true }));
      });
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        const newSuccess: Partial<Record<keyof T, boolean>> = {};
        
        allFields.forEach(field => {
          const fieldError = error.errors.find(e => e.path[0] === field);
          if (fieldError) {
            newErrors[field] = fieldError.message;
            newSuccess[field] = false;
          } else {
            newSuccess[field] = true;
          }
        });
        
        setErrors(newErrors);
        setSuccess(newSuccess);
        
        // Mark all fields as touched on submit
        const allTouched = allFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Partial<Record<keyof T, boolean>>);
        setTouchedState(allTouched);
        
        return false;
      }
      throw error;
    }
  }, [values, schema]);

  const getFieldState = useCallback((field: keyof T): ValidationState => {
    return {
      isValid: !errors[field] && !!success[field],
      error: errors[field],
      touched: !!touched[field],
      validating: !!validating[field],
      success: !!success[field],
    };
  }, [errors, touched, validating, success]);

  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setTouchedState({});
    setValidating({});
    setSuccess({});
    setIsSubmitting(false);
  }, []);

  // Calculate overall validity
  const isValid = Object.keys(errors).length === 0 && 
    Object.values(success).some(s => s === true) &&
    !Object.values(success).some(s => s === false);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debouncedValidateRef.current) {
        clearTimeout(debouncedValidateRef.current);
      }
    };
  }, []);

  return {
    values,
    errors,
    touched,
    validating,
    success,
    isValid,
    isSubmitting,
    setValue,
    setTouched,
    validateField,
    validateAll,
    getFieldState,
    reset,
    setIsSubmitting,
  };
}

// Enhanced debounce utility
export function createDebouncedValidator<T>(
  validator: (value: T) => Promise<string | undefined>,
  delay: number = 300
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (value: T): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const result = await validator(value);
        resolve(result);
      }, delay);
    });
  };
}
