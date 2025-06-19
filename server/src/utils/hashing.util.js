import crypto from 'crypto';

const hash = (value)=> {
  return crypto.createHash('sha256', process.env.JWT_SECRET).update(value).digest('hex');
};

export default {
  hash
};
