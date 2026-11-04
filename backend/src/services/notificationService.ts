import { sendEmail } from "./emailService.js";
import {
  lowStockAlertTemplate,
} from "../schemas/slackTemplates.js";
import {
  LOW_STOCK_SUBJECT,
  lowStockAlertEmailHtml,
} from "../schemas/emailTemplates.js";
import {
  sendSlackNotification,
  type SlackMessageContent,
} from "./slackService.js";
import { supabaseAdmin } from "../db.js";

export type NotificationChannel = "slack" | "email";

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  slackUserId: string | null;
  error?: string;
}

export async function sendUserNotification(
  email: string,
  slackContent: SlackMessageContent,
  emailHtml: string,
  emailSubject: string,
): Promise<NotificationResult> {
  const slackResult = await sendSlackNotification(email, slackContent);

  if (slackResult.success) {
    return {
      success: true,
      channel: "slack",
      slackUserId: slackResult.slackUserId,
    };
  }

  console.log(
    `[NotificationService] Slack falló para ${email}, enviando por email. Razón: ${slackResult.error}`,
  );

  try {
    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });
    return { success: true, channel: "email", slackUserId: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error(
      `[NotificationService] Email también falló para ${email}:`,
      errorMessage,
    );
    return {
      success: false,
      channel: "email",
      slackUserId: null,
      error: errorMessage,
    };
  }
}

const LOW_STOCK_THRESHOLD = 5;

export interface LowStockProduct {
  id: string;
  name: string;
  entrepreneurship_name: string;
  owner_id: string;
  owner_email: string;
  owner_name: string;
}

export const checkAndNotifyLowStock = async (
  products: Array<{
    product_id: string;
    new_stock: number;
    location_id?: string;
  }>,
): Promise<void> => {
  for (const item of products) {
    if (item.new_stock >= LOW_STOCK_THRESHOLD) continue;

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select(
        `
        id,
        name,
        entrepreneurship:entrepreneurship_id(
          name,
          owner:owner_id(id, email, name)
        )
      `,
      )
      .eq("id", item.product_id)
      .single();

    if (error || !product) continue;

    const entData = product.entrepreneurship as unknown as {
      name: string;
      owner: { id: string; email: string; name: string };
    };
    const owner = entData.owner;

    const blocks = lowStockAlertTemplate(
      owner.name,
      product.name,
      entData.name,
      item.new_stock,
    );

    const html = lowStockAlertEmailHtml(
      owner.name,
      product.name,
      entData.name,
      item.new_stock,
    );

    try {
      const notificationResult = await sendUserNotification(
        owner.email,
        blocks,
        html,
        LOW_STOCK_SUBJECT,
      );

      console.log(
        `[LowStockNotify] ${notificationResult.channel}: ${owner.name} - ${product.name} (stock: ${item.new_stock})`,
      );
    } catch (err) {
      console.error("[LowStockNotify] Error:", err);
    }
  }
};
