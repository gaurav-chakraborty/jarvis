interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'custom';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  message?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

export const VALIDATION_RULES = {
  companyName: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Company name must be 2-100 characters',
  } as ValidationRule,

  roleTitle: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Role title must be 3-100 characters',
  } as ValidationRule,

  interviewer: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Interviewer name must be 2-100 characters',
  } as ValidationRule,

  email: {
    type: 'email',
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  } as ValidationRule,

  url: {
    type: 'url',
    required: false,
    pattern: /^https?:\/\/.+/,
    message: 'Please enter a valid URL',
  } as ValidationRule,
};

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\"']/g, (char) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return escapeMap[char] || char;
    });
}

export function validateInput(
  value: any,
  rule: ValidationRule
): { valid: boolean; error?: string } {
  if (rule.required && (!value || value.toString().trim() === '')) {
    return { valid: false, error: `${rule.message || 'This field is required'}` };
  }

  if (!value) {
    return { valid: true };
  }

  const stringValue = value.toString().trim();

  if (rule.minLength && stringValue.length < rule.minLength) {
    return {
      valid: false,
      error: rule.message || `Minimum ${rule.minLength} characters required`,
    };
  }

  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return {
      valid: false,
      error: rule.message || `Maximum ${rule.maxLength} characters allowed`,
    };
  }

  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return {
      valid: false,
      error: rule.message || 'Invalid format',
    };
  }

  if (rule.validator && !rule.validator(value)) {
    return {
      valid: false,
      error: rule.message || 'Validation failed',
    };
  }

  return { valid: true };
}

export function validateObject(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Record<string, string[]> = {};
  let valid = true;

  for (const [key, rule] of Object.entries(rules)) {
    const result = validateInput(data[key], rule);
    if (!result.valid) {
      valid = false;
      errors[key] = errors[key] || [];
      if (result.error) {
        errors[key].push(result.error);
      }
    }
  }

  return { valid, errors };
}

export function sanitizeObject<T extends Record<string, any>>(
  data: T
): T {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
