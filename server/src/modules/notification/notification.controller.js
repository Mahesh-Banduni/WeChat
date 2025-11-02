import notificationService from "./notification.service.js";

const storeFirebaseToken = async(req, res, next) =>{
  try {
    const userId = req.user.id;
    const {token} =req.body;
    const result = await notificationService.storeFirebaseToken(userId, token);
    res.status(200).json({
        message: "Token stored successfully"
    });
  } catch (error) {
    next(error);
  }
}

const loadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.loadNotifications(userId);
    res.status(200).json({
        message: "Notifications retreived successfully",
        notifications,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const notification = await notificationService.markNotificationAsRead(userId, notificationId);
    res.status(200).json({
        message: "Notifications marked as read successfully",
        notification,
    });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.markAllNotificationsAsRead(userId);
    res.status(200).json({
        message: "All notifications are marked as read successfully",
        notifications,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  storeFirebaseToken, loadNotifications, markNotificationAsRead, markAllNotificationsAsRead
};
