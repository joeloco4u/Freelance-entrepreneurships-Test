import type { SlackMessageContent } from "../services/slackService.ts";

/**
 * Plantilla para notificaciones de solicitudes de registro (IT)
 */
export const signupRequestTemplate = (
  userName: string,
  email: string,
  entrepreneurshipName: string = "",
  roles: string[],
): SlackMessageContent => {
  const rolesText = roles.map((r) => `• ${r}`).join("\n");

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Nueva Solicitud de Registro",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Se ha recibido una nueva solicitud de registro:\n\n*Nombre:* ${userName}\n*Email:* ${email}\n${entrepreneurshipName ? `*Emprendimiento:* ${entrepreneurshipName}\n` : ""}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Roles solicitados:*\n${rolesText}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_Revisa la solicitud en el panel de IT para aprobarla o rechazarla._`,
      },
    },
  ];
};

/**
 * Plantilla para la confirmación de compra del Consumidor
 */
function paymentTypeLabel(
  paymentType?: string,
  paymentMethod?: string,
): string {
  if (paymentType === "immediate") {
    const methodMap: Record<string, string> = {
      efectivo: "Efectivo",
      binance: "Binance",
      pago_movil: "Pago Móvil",
    };
    return `⚡ Pago Inmediato - ${methodMap[paymentMethod || ""] || paymentMethod}`;
  }
  return "💳 Crédito (nómina)";
}

const SLACK_NOTE_MAX_LENGTH = 2800;
const SLACK_NOTE_ESCAPED_MAX_LENGTH = 2900;

function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatSlackNote(note?: string | null): string {
  const trimmed = note?.trim();
  if (!trimmed) return "";

  const codePoints = Array.from(trimmed);
  const rawText =
    codePoints.length > SLACK_NOTE_MAX_LENGTH
      ? `${codePoints.slice(0, SLACK_NOTE_MAX_LENGTH).join("")}...`
      : trimmed;

  const escaped = escapeSlackText(rawText);
  return escaped.length > SLACK_NOTE_ESCAPED_MAX_LENGTH
    ? escaped.slice(0, SLACK_NOTE_ESCAPED_MAX_LENGTH)
    : escaped;
}

export const consumerPurchaseTemplate = (
  name: string,
  orderId: string = "",
  total: number,
  items: any[],
  paymentType?: string,
  paymentMethod?: string,
  note?: string | null,
): SlackMessageContent => {
  const idParts = orderId.split("-");

  // 2. Extraemos el primer elemento
  const firstPart = idParts[0];

  // 3. Verificamos que firstPart sea un string y no esté vacío
  // Esto hace "narrowing" y garantiza que NO sea undefined para el .toUpperCase()
  const displayId =
    firstPart && typeof firstPart === "string"
      ? firstPart.toUpperCase()
      : "N/A";

  const noteText = formatSlackNote(note);

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "¡Confirmación de Compra! 🛍️",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hola *${name}*, gracias por tu apoyo a los emprendimientos.\n*Orden:* \`#${displayId}\`\n*Tipo de pago:* ${paymentTypeLabel(paymentType, paymentMethod)}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Resumen de productos:*\n" +
          items
            .map(
              (p) =>
                `• ${p.name} | *${p.quantity}* x $${p.price.toLocaleString()} = *$${(
                  p.quantity * p.price
                ).toLocaleString()}*`,
            )
            .join("\n"),
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total Pagado:* ✨ *$${total.toLocaleString()}*`,
        },
      ],
    },
    ...(noteText
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Nota:*\n${noteText}`,
            },
          } as const,
        ]
      : []),
  ];
};

/**
 * Plantilla para el aviso de venta del Emprendedor
 */
export const entrepreneurSaleTemplate = (
  ownerName: string,
  orderId: string = "",
  products: any[],
  customerName: string,
  paymentType?: string,
  paymentMethod?: string,
  note?: string | null,
): SlackMessageContent => {
  const subtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);

  const idParts = orderId.split("-");

  // 2. Extraemos el primer elemento
  const firstPart = idParts[0];

  // 3. Verificamos que firstPart sea un string y no esté vacío
  // Esto hace "narrowing" y garantiza que NO sea undefined para el .toUpperCase()
  const displayId =
    firstPart && typeof firstPart === "string"
      ? firstPart.toUpperCase()
      : "N/A";

  const isImmediate = paymentType === "immediate";
  const paymentLabel = paymentTypeLabel(paymentType, paymentMethod);
  const noteText = formatSlackNote(note);

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "¡Nueva Venta Recibida! 🎉",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hola *${ownerName}*, *${customerName}* ha realizado una compra en tu emprendimiento.\n*Orden:* \`#${displayId}\`\n*Tipo de pago:* ${paymentLabel}`,
      },
    },
    ...(isImmediate
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "⚠️ *Importante:* Este es un pago inmediato. Coordina con el consumidor para recibir el pago y luego marca los items como \"Pago recibido\" desde tu panel de ventas.",
            },
          } as const,
        ]
      : []),
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*Tus productos vendidos:*\n" +
          products
            .map(
              (p) =>
                `• ${p.name} | *${p.quantity}* x $${p.price.toLocaleString()} = *$${(p.quantity * p.price).toLocaleString()}*`,
            )
            .join("\n"),
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Tu ganancia:* *$${subtotal.toLocaleString()}*`,
        },
      ],
    },
    ...(noteText
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Nota del cliente:*\n${noteText}`,
            },
          } as const,
        ]
      : []),
  ];
};

export const refundTemplate = (
  items: Array<{ quantity: number; unit_price: number; products: { name: string } }>,
  total: number,
  refundType: "full" | "partial",
): SlackMessageContent => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${
          refundType === "full" ? "Reembolso Completado" : "Reembolso Parcial"
        }`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "Se ha procesado un reembolso por los siguientes items:\n" +
          items
            .map(
              (item) =>
                `• ${item.products.name} | *${item.quantity}* x $${item.unit_price.toLocaleString()} = *$${(
                  item.quantity * item.unit_price
                ).toLocaleString()}*`,
            )
            .join("\n"),
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total reembolsado:* ✨ *$${total.toLocaleString()}*`,
        },
        {
          type: "mrkdwn",
          text: `Tipo: *${
            refundType === "full" ? "Reembolso total" : "Reembolso parcial"
          }*`,
        },
      ],
    },
  ];
};

interface SaleNotificationProduct {
  name: string;
  quantity: number;
  price: number;
  entrepreneurship_name?: string;
  owner_name?: string;
}

interface SaleNotificationSeller {
  name: string;
  products: SaleNotificationProduct[];
  subtotal: number;
}

export const saleNotificationTemplate = (
  consumerName: string,
  orderId: string = "",
  total: number,
  items: SaleNotificationProduct[],
  sellers: SaleNotificationSeller[],
  paymentType?: string,
  paymentMethod?: string,
  note?: string | null,
): SlackMessageContent => {
  const idParts = orderId.split("-");
  const firstPart = idParts[0];
  const displayId =
    firstPart && typeof firstPart === "string"
      ? firstPart.toUpperCase()
      : "N/A";

  const productsList =
    items.length > 0
      ? items
          .map(
            (p) =>
              `• ${p.name} | *${p.quantity}* x $${p.price.toLocaleString()} = *$${(p.quantity * p.price).toLocaleString()}*`,
          )
          .join("\n")
      : "_Sin productos_";

  const sellersList =
    sellers.length > 0
      ? sellers
          .map(
            (s) =>
              `• *${s.name}*: $${s.subtotal.toLocaleString()} (${s.products.length} producto(s))`,
          )
          .join("\n")
      : "_Sin emprendedores_";

  const paymentLabel = paymentTypeLabel(paymentType, paymentMethod);
  const noteText = formatSlackNote(note);

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Nueva Venta Realizada 💰",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Se ha registrado una nueva venta:\n*Consumidor:* ${consumerName}\n*Orden:* \`#${displayId}\`\n*Tipo de pago:* ${paymentLabel}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Nueva compra realizada*\n\n*Cliente:* ${consumerName}\n*Orden:* \`#${displayId}\`\n*Total:* $${total.toLocaleString()}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Productos vendidos:*\n${productsList}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Emprendedores involucrados:*\n${sellersList}`,
      },
    },
    ...(noteText
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Nota del cliente:*\n${noteText}`,
            },
          } as const,
        ]
      : []),
  ];
};

export const lowStockAlertTemplate = (
  ownerName: string,
  productName: string,
  entrepreneurshipName: string,
  currentStock: number,
): SlackMessageContent => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⚠️ Alerta de Stock Bajo",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hola *${ownerName}*, uno de tus productos tiene stock bajo:\n\n*Producto:* ${productName}\n*Emprendimiento:* ${entrepreneurshipName}\n*Stock actual:* ${currentStock} unidades`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "_Por favor, repón el inventario pronto para evitar perder ventas._",
      },
    },
  ];
};

interface BatchRefundItem {
  saleId: string;
  items: Array<{ quantity: number; unit_price: number; products: { name: string } }>;
  total: number;
  type: "full" | "partial";
}

export const refundBatchTemplate = (
  refundGroups: BatchRefundItem[],
  grandTotal: number,
): SlackMessageContent => {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Reembolsos Procesados (${refundGroups.length} venta${refundGroups.length === 1 ? "" : "s"})`,
        emoji: true,
      },
    },
  ];

  refundGroups.forEach((group, index) => {
    if (index > 0) {
      blocks.push({ type: "divider" });
    }

    const itemsList = group.items
      .map(
        (item) =>
          `• ${item.products.name} | *${item.quantity}* x $${item.unit_price.toLocaleString()} = *$${(
            item.quantity * item.unit_price
          ).toLocaleString()}*`,
      )
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*Venta:* \`#${group.saleId.slice(0, 8).toUpperCase()}\`\n` +
          `*Tipo:* ${group.type === "full" ? "Reembolso total" : "Reembolso parcial"}\n` +
          `*Items reembolsados:*\n${itemsList}`,
      },
    });

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Total de esta venta:* $${group.total.toLocaleString()}`,
        },
      ],
    });
  });

  blocks.push(
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*✅ Total general reembolsado:* ✨ *$${grandTotal.toLocaleString()}*`,
      },
    },
  );

  return blocks;
};
