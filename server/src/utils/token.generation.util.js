import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
      {
        id: user.userId,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  };

  export default {
    generateToken
  };