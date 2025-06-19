import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// JWT authentication middleware
const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  token = token.replace(/^"|"$/g, '');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT error:', err);
      return res.status(403).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  });
};

export default auth;