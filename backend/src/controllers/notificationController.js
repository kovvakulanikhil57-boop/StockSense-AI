const { query } = require('../db/dbAdapter');

/**
 * Get all notifications for authenticated user
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user.userId;
    const notifications = await query(
      `SELECT notification_id, title, message, type, is_read, link, created_at
       FROM Notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark a specific notification as read
 */
async function markAsRead(req, res) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    await query(
      'UPDATE Notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

/**
 * Mark all notifications as read for current user
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.userId;
    await query('UPDATE Notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
