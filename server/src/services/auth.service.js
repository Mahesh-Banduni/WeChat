import JWTToken from "../utils/token.generation.util.js";
import hashValue from "../utils/hashing.util.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError
} from "../errors/errors.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Login a user and issue a JWT token
const authUser = async (email, password) => {

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError("No user exist with this email address");
  }

  const hashPassword = hashValue.hash(password);

  // Check password is correct
  if (user.password !== hashPassword) {
    throw new BadRequestError("Incorrect password");
  }

  const response=JWTToken.generateToken(user);
  return { response, user: {name: user.name, email: user.email}};
};

export default {
  authUser, 
}
