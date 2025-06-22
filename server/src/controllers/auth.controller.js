import authService from "../services/auth.service.js";

// Login a user
const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { response, user } = await authService.authUser(
      email,
      password
    );
    // Send back the user data and the token
    res.status(200).json({
      message: "Login successful.",
      token: `${response}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

export default {authUser}