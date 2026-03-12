export const validateEmail = (email) => {
    return /^\S+@\S+\.\S+$/.test(email);
};
export const validateRequired = (value) => {
    if (value === undefined || value === null)
        return false;
    if (typeof value === 'string' && value.trim() === '')
        return false;
    if (typeof value === 'boolean')
        return value;
    return true;
};
export const validateLength = (value, min, max) => {
    if (!value)
        return false;
    return value.length >= min && value.length <= max;
};
