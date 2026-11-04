import {
  type Block,
  type KnownBlock,
  type WebAPIPlatformError,
  WebClient,
} from "@slack/web-api";
import { supabaseAdmin } from "../db.js";
import { lowStockAlertTemplate } from "../schemas/slackTemplates.js";
import { getSlackBotTokenFromSheet } from "./googleSheetsService.js";

let slackClient: WebClient | null = null;
let cachedToken: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const ensureSlackClient = async (): Promise<WebClient | null> => {
  const now = Date.now();
  if (slackClient && cachedToken && (now - lastFetchTime) < CACHE_TTL_MS) {
    return slackClient;
  }

  const token = await getSlackBotTokenFromSheet();
  if (!token) {
    console.error("[SlackService] No se pudo obtener el token de Slack");
    return null;
  }

  slackClient = new WebClient(token);
  cachedToken = token;
  lastFetchTime = now;
  return slackClient;
};

const LOW_STOCK_THRESHOLD = 5;

export type SlackMessageContent = (Block | KnownBlock)[];

interface SlackWebhookResponse {
  success: boolean;
  error?: string;
}

/**
 * Sends a notification to a Slack channel via webhook URL.
 * Used for channel-wide notifications (e.g., IT team notifications).
 */
export const sendSlackWebhookNotification = async (
  webhookUrl: string,
  content: SlackMessageContent,
): Promise<SlackWebhookResponse> => {
  try {
    const payload = {
      blocks: content,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SlackService] Webhook error: ${response.status} - ${errorText}`,
      );
      return {
        success: false,
        error: `Webhook returned status ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error: unknown) {
    const genericError = error as Error;
    console.error(
      `[SlackService] Fallo al enviar notificación via webhook:`,
      genericError.message,
    );
    return {
      success: false,
      error: genericError.message,
    };
  }
};

export interface SlackNotificationResponse {
  success: boolean;
  slackUserId: string | null;
  error?: string;
}

const resolveSlackId = async (
  client: WebClient,
  email: string,
): Promise<string | null> => {
  try {
    const result = await client.users.lookupByEmail({ email });
    return result.user?.id || null;
  } catch (error: unknown) {
    const slackError = error as WebAPIPlatformError;

    console.error(
      `[SlackService] Error buscando email ${email}:`,
      slackError.data?.error || slackError.message,
    );
    return null;
  }
};

/**
 * Busca el ID de un usuario en Slack utilizando su correo electrónico.
 */
export const getSlackIdByEmail = async (
  email: string,
): Promise<string | null> => {
  const client = await ensureSlackClient();
  if (!client) return null;
  return resolveSlackId(client, email);
};

/**
 * Envía una notificación de Slack.
 * Retorna los datos necesarios para que el controlador realice el registro en DB.
 */
export const sendSlackNotification = async (
  email: string,
  content: SlackMessageContent,
): Promise<SlackNotificationResponse> => {
  const client = await ensureSlackClient();
  if (!client) {
    return {
      success: false,
      slackUserId: null,
      error: "No se pudo inicializar el cliente de Slack",
    };
  }

  const slackUserId = await resolveSlackId(client, email);

  if (!slackUserId) {
    return {
      success: false,
      slackUserId: null,
      error: `No se encontró un usuario de Slack vinculado al correo: ${email}`,
    };
  }

  try {
    await client.chat.postMessage({
      channel: slackUserId,
      text: "Actualización de pedido", // Fallback para notificaciones push
      blocks: content,
    });

    return {
      success: true,
      slackUserId,
    };
  } catch (error: unknown) {
    // Aquí capturamos cualquier error (de red o de Slack)
    const genericError = error as Error;

    console.error(
      `[SlackService] Fallo al enviar notificación a ${email}:`,
      genericError.message,
    );

    return {
      success: false,
      slackUserId,
      error: genericError.message,
    };
  }
};

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

    try {
      const resSlack = await sendSlackNotification(owner.email, blocks);

      await supabaseAdmin.from("notification_logs").insert({
        product_id: product.id,
        user_id: owner.id,
        slack_user_id: resSlack.slackUserId,
        message_type: "LOW_STOCK_ALERT",
        message: blocks,
        status: resSlack.success ? "sent" : "error",
        error_message: resSlack.error,
      });
    } catch (err) {
      console.error("[LowStockNotify] Error:", err);
    }
  }
};
