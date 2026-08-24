import jwt from 'jsonwebtoken';

const getSecret = () => {
  return process.env.JWT_SECRET || 'fallback_secret_for_dev';
};

export const generateToken = (payload: object, expiresIn: string = '1d') => {
  return jwt.sign(payload, getSecret(), { expiresIn } as any);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, getSecret());
};
