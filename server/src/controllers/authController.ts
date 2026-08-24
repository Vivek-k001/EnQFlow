import { Request, Response } from 'express';
import { db } from '../database/index';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;
    
    if (!user) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log('Password mismatch. Received password:', password, 'Expected hash:', user.password_hash);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Login successful for user:', email);

    const token = generateToken({
      id: user.id,
      organization_id: user.organization_id,
      role: user.role,
      name: user.name
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id
      }
    });
  } catch (error) {
    console.error('Catch block error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
