import { apiFetch } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

export async function listNotifications(): Promise<NotificationItem[]> {
  return apiFetch<NotificationItem[]>("/notifications");
}
