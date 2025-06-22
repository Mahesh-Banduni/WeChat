import { NotFoundError, BadRequestError, ConflictError } from "../errors/errors.js";
import { PrismaClient } from "@prisma/client";
import JWTToken from "../utils/token.generation.util.js";
import hashValue from "../utils/hashing.util.js";

const prisma = new PrismaClient();

// Create a new user
const createUser = async (userData) => {
  const email = userData.email;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new ConflictError("User with this email already exists");
  }

  const password = hashValue.hash(userData.password);

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: email,
      password: password,
    },
    select: {
      userId: true,
      name: true,
    }
  });

  const response = JWTToken.generateToken(user);

  return { response, user: {name: user.name, email: user.email}};
};

const getConnections = async (userId) => {
  const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
  }

  const connections = await prisma.connection.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true },
  });

  return connections.map(conn => conn.userA.id === userId ? conn.userB : conn.userA);
};

const getUserById = async (userId) => {
  const user = await prisma.user.findFirst({
    where: {userId},
    select:{
      userId: true,
      name: true,
      email: true,
    }
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};


// const getAllUsers = async (adminId) => {
//   const adminCheck = await prisma.user.findFirst({
//     where: { userId: adminId, role: "ADMIN" },
//   });

//   if (!adminCheck) {
//     throw new BadRequestError("Unauthorized access");
//   }

//   const users = await prisma.user.findMany();
//   return users;
// };

// const getUserById = async (userId) => {
//   const user = await prisma.user.findFirst({
//     where: {userId},
//     select:{
//       userId: true,
//       name: true,
//       email: true,
//       role: true
//     }
//   });
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }
//   return user;
// };

// const updateUser = async (adminId, userId, updateData, files) => {
//   const adminCheck = await prisma.user.findFirst({
//     where: { userId: adminId, role: "ADMIN" },
//   });

//   if (!adminCheck) {
//     throw new BadRequestError("Unauthorized access");
//   }
//   const user = await prisma.user.findUnique({
//     where: { userId: userId },
//   });
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   let updatedFields = {};
//   if (updateData.name) updatedFields.name = updateData.name;
//   if (updateData.password) updatedFields.password = hashValue.hash(updateData.password);

//   const updatedUser = await prisma.user.update({
//     where: { userId: userId },
//     data: updatedFields,
//   });

//   return updatedUser;
// };

// const deleteUser = async (adminId, userId) => {
//   const adminCheck = await prisma.user.findFirst({
//     where: { userId: adminId, role: "ADMIN" },
//   });

//   if (!adminCheck) {
//     throw new BadRequestError("Unauthorized access");
//   }

//   let user = await prisma.user.findUnique({
//     where: { userId: userId },
//   });
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//  user = await prisma.user.delete({
//     where: { userId: userId },
//   });
//   return user;
// };

export default {
  createUser,
  getConnections,
  // getAllUsers,
  getUserById,
  // updateUser,
  // deleteUser,
}