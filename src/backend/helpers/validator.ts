export const validateEmail = (email: string): boolean => {
  return /^\S+@\S+\.\S+$/.test(email);
};

export const validateRequired = (value: any): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (typeof value === 'boolean') return value;
  return true;
};

export const validateLength = (value: string, min: number, max: number): boolean => {
  if (!value) return false;
  return value.length >= min && value.length <= max;
};
