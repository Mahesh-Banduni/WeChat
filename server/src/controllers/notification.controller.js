import notificationService from "../services/notification.service.js";

const loadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notification = await notificationService.loadNotifications(userId);
    res.status(200).json({
        message: "Notifications retreived successfully",
        notification,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  loadNotifications,
};
