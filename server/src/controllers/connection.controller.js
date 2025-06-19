import connectionService from "../services/connection.service.js";

const sendInvite = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { email } = req.body;
    const invite = await connectionService.sendInvite(senderId, email);
    res.status(201).json({
        message: "Invite sent successfully",
        invite,
    });
  } catch (error) {
    next(error);
  }
};

const acceptInvite = async (req, res, next) => {
 try{
  const inviteId = req.params.id;
  const userId = req.user.id;
  const result = await connectionService.acceptInvite(inviteId, userId);
  res.status(200).json({
      message: "Invite accepted successfully",
      result,
    });
 }
 catch (error) {
  next(error);
 }
};

const allInvites = async (req, res, next) => {
 try{
  const userId = req.user.id;
  const result = await connectionService.allInvites(userId);
  res.status(200).json({
      message: "List of invites retrieved successfully",
      result,
    });
 }
 catch (error) {
  next(error);
 }
};

const allConnections = async (req, res, next) => {
 try{
  const userId = req.user.id;
  const result = await connectionService.allConnections(userId);
  res.status(200).json({
      message: "List of connections retrieved successfully",
      result,
    });
 }
 catch (error) {
  next(error);
 }
};

export default {
  sendInvite,
  acceptInvite,
  allInvites,
  allConnections
};
