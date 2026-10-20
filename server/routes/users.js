import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createUserSchema, updateUserStatusSchema, updateUserRoleSchema, changePasswordSchema, validateBody } from '../validation/schemas.js';

export default function userRoutes(prisma) {
  const router = Router();

  // Create user (admin)
  router.post('/users', validateBody(createUserSchema), async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      const existing = await prisma.appUser.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.appUser.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'user',
          status: 'active',
          joinedAt: new Date(),
          lastActive: new Date(),
        },
      });

      res.json({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          joinedAt: user.joinedAt.toISOString().split('T')[0],
          lastActive: user.lastActive.toISOString().split('T')[0],
        },
      });
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
      res.status(500).json({ error: err.message });
    }
  });

  // List users with pagination, search, and filters
  router.get('/users', async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '', role = '', status = '' } = req.query;
      const where = {};

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }
      if (role) where.role = role;
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        prisma.appUser.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { joinedAt: 'desc' },
        }),
        prisma.appUser.count({ where }),
      ]);

      const mapped = data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar,
        bio: u.bio,
        joinedAt: u.joinedAt.toISOString().split('T')[0],
        lastActive: u.lastActive.toISOString().split('T')[0],
        social: JSON.parse(u.social || '{}'),
        preferences: JSON.parse(u.preferences || '{}'),
      }));

      res.json({ data: mapped, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single user
  router.get('/users/:id', async (req, res) => {
    try {
      const user = await prisma.appUser.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          bio: user.bio,
          joinedAt: user.joinedAt.toISOString().split('T')[0],
          lastActive: user.lastActive.toISOString().split('T')[0],
          social: JSON.parse(user.social || '{}'),
          preferences: JSON.parse(user.preferences || '{}'),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user status
  router.put('/users/:id/status', validateBody(updateUserStatusSchema), async (req, res) => {
    try {
      const { status } = req.body;

      await prisma.appUser.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Update user role
  router.put('/users/:id/role', validateBody(updateUserRoleSchema), async (req, res) => {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'role is required' });

      await prisma.appUser.update({
        where: { id: req.params.id },
        data: { role },
      });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Change password
  router.put('/users/:id/password', validateBody(changePasswordSchema), async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.appUser.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.password && !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.appUser.update({
        where: { id: req.params.id },
        data: { password: hashedPassword },
      });

      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user
  router.delete('/users/:id', async (req, res) => {
    try {
      await prisma.appUser.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
