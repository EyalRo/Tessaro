import express from 'express';
import ScyllaClient from '../../../libs/database/src/scylla-client';
import UserService from '../../../libs/database/src/user-service';

const app = express();
app.use(express.json());

// Initialize database client
const dbClient = new ScyllaClient({
  contactPoints: ['scylladb:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'tessaro_admin'
});

const userService = new UserService(dbClient);

// Create user endpoint
app.post('/users', async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user by ID endpoint
app.get('/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user endpoint
app.put('/users/:id', async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user endpoint
app.delete('/users/:id', async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default app;
