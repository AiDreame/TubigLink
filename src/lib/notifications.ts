/**
 * Notification helpers — consistent order-status notification messages.
 */

const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
  ACCEPTED: {
    title: "Order accepted",
    message: "Your order has been accepted! Your water is being prepared.",
  },
  PREPARING: {
    title: "Order being prepared",
    message: "Your order is now being prepared at the station.",
  },
  OUT_FOR_DELIVERY: {
    title: "Out for delivery",
    message: "Your order is on the way!",
  },
  DELIVERED: {
    title: "Order delivered",
    message: "Your order has been delivered. Please rate your experience.",
  },
  CANCELLED: {
    title: "Order cancelled",
    message: "", // filled dynamically with order ID
  },
  PENDING: {
    title: "Order received",
    message: "Your order has been received and is pending acceptance.",
  },
};

export function getOrderStatusNotification(
  status: string,
  stationName: string,
  orderId: string
): { title: string; message: string } {
  const shortId = orderId.slice(-6).toUpperCase();
  const template = STATUS_MESSAGES[status];

  if (!template) {
    return {
      title: `Order ${status.replace(/_/g, " ").toLowerCase()}`,
      message: `Your order #${shortId} from ${stationName} is now: ${status.replace(/_/g, " ").toLowerCase()}`,
    };
  }

  if (status === "CANCELLED") {
    return {
      title: template.title,
      message: `Your order #${shortId} from ${stationName} has been cancelled.`,
    };
  }

  return {
    title: template.title,
    message: template.message,
  };
}
