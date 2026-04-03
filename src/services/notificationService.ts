// expo-notifications is listed in package.json — run `npm install` if this import fails
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: expo-notifications may not be installed yet
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Expense, User } from "../types";

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /** Request permission and register for push notifications. */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#5bc5a7",
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[NotificationService] Push notification permission denied");
        return null;
      }

      // Try to get push token - this requires Firebase setup for Android
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = tokenData.data;
        console.log("[NotificationService] Push token registered successfully");
        return this.expoPushToken;
      } catch (error) {
        console.warn("[NotificationService] Failed to get push token (Firebase not configured):", error instanceof Error ? error.message : error);
        console.log("[NotificationService] Local notifications will still work");
        return null;
      }
    } catch (error) {
      console.error("[NotificationService] Failed to register for push notifications:", error);
      return null;
    }
  }

  /** Get the currently stored push token */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // ─── Local Notifications ───────────────────────────────────────────────────

  /** Notify when a new expense is added */
  async notifyNewExpense(expense: Expense, addedByUser: User): Promise<void> {
    const isYou = addedByUser.id === expense.paidBy.id;
    const paidByLabel = isYou ? "You" : addedByUser.name;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New Expense Added",
        body: `${paidByLabel} added "${expense.description}" for ₹${expense.amount.toFixed(2)}`,
        data: { type: "new_expense", expenseId: expense.id },
        sound: true,
      },
      trigger: null, // Deliver immediately
    });
  }

  /** Notify when a debt is settled */
  async notifySettlement(
    fromUser: User,
    toUser: User,
    amount: number,
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Payment Recorded",
        body: `${fromUser.name} paid ₹${amount.toFixed(2)} to ${toUser.name}`,
        data: {
          type: "settlement",
          fromUserId: fromUser.id,
          toUserId: toUser.id,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  /** Schedule a reminder for a recurring expense */
  async scheduleRecurringExpenseReminder(
    expense: Expense,
    nextDueDate: Date,
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recurring Expense Due",
        body: `"${expense.description}" of ₹${expense.amount.toFixed(2)} is due`,
        data: { type: "recurring_due", expenseId: expense.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextDueDate,
      },
    });
    return identifier;
  }

  /** Cancel a scheduled notification by its identifier */
  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  /** Cancel all scheduled notifications */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /** Set badge count (iOS) */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /** Add a listener for received notifications */
  addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void,
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(handler);
  }

  /** Add a listener for notification responses (user tapped) */
  addNotificationResponseReceivedListener(
    handler: (response: Notifications.NotificationResponse) => void,
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }
}

export default NotificationService;
