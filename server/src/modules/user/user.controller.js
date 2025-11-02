import userService from "./user.service.js";

// Create a new user
const createUser = async (req, res, next) => {
  try {
    const { response, user } = await userService.createUser(req.body);

    res.status(201).json({
      message: "User registration successful.",
      token: `${response}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const userId=req.user.id;
    const user = await userService.getUserById(userId);
    res.status(200).json({
      user: user, 
      message: "User details retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};


// // Get all users
// const getAllUsers = async (req, res, next) => {
//   const adminId= req.user.id;
//   try {
//     const users = await userService.getAllUsers(adminId);
//     if(!users){
//       throw new NotFoundError("Users not found");
//     }
//     res.status(200).json({
//       data: {users},
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Get user by ID
// const getUserById = async (req, res, next) => {
//   try {
//     const userId=req.user.id;
//     const user = await userService.getUserById(userId);
//     res.status(200).json({
//       user: user, 
//       message: "User details retrieved successfully",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Update user by ID
// const updateUser = async (req, res, next) => {
//   try {
//     const adminId= req.user.id;
//     const userId=req.params.id;
//     const updatedUser = await userService.updateUser(adminId, userId, req.body);
//     res.status(200).json({
//       message: "User Details Updated Successfully",
//       user: updatedUser,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Delete user by ID
// const deleteUser = async (req, res, next) => {
//   try {
//     const adminId= req.user.id;
//     const userId=req.params.id;
//     await userService.deleteUser(adminId, userId);
//     res.status(200).json({ message: "User deleted successfully" });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = {
//   createUser,
//   getConnectedUsers,
//   // getAllUsers,
//   // getUserById,
//   // updateUser,
//   // deleteUser,
// };

export default {
  createUser, 
  getUserById
}