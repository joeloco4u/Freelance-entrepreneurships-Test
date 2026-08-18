function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const CONSUMER_PURCHASE_SUBJECT = "Confirmaci\u00F3n de Compra - Freelance LATAM";

function emailPaymentTypeLabel(
  paymentType?: string,
  paymentMethod?: string,
): string {
  if (paymentType === "immediate") {
    const methodMap: Record<string, string> = {
      efectivo: "Efectivo",
      binance: "Binance",
      pago_movil: "Pago Móvil",
    };
    return `Pago Inmediato - ${methodMap[paymentMethod || ""] || paymentMethod}`;
  }
  return "Crédito (nómina)";
}

export const consumerPurchaseEmailHtml = (
  name: string,
  orderId: string,
  total: number,
  items: Array<{ name: string; quantity: number; price: number }>,
  paymentType?: string,
  paymentMethod?: string,
): string => {
  const idParts = orderId.split("-");
  const displayId =
    idParts[0] && typeof idParts[0] === "string"
      ? idParts[0].toUpperCase()
      : "N/A";

  const esc = escapeHtml;
  const itemsHtml = items
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${esc(p.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${p.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${p.price.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${(p.quantity * p.price).toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  const paymentLabel = emailPaymentTypeLabel(paymentType, paymentMethod);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">&iexcl;Confirmaci&oacute;n de Compra!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;">
                Hola <strong>${esc(name)}</strong>, gracias por tu apoyo a los emprendimientos.
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#666;">
                Orden: <strong>#${esc(displayId)}</strong>
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#888;">
                Tipo de pago: <strong>${esc(paymentLabel)}</strong>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#f8f8f8;">
                    <th style="padding:10px;text-align:left;font-size:13px;color:#555;">Producto</th>
                    <th style="padding:10px;text-align:center;font-size:13px;color:#555;">Cant.</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Precio</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:10px;text-align:right;font-weight:bold;font-size:16px;">Total Pagado:</td>
                    <td style="padding:10px;text-align:right;font-weight:bold;font-size:16px;color:#667eea;">$${total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
              Freelance LATAM &mdash; Apoyando el emprendimiento local
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const ENTREPRENEUR_SALE_SUBJECT =
  "Nueva Venta Recibida - Freelance LATAM";

export const entrepreneurSaleEmailHtml = (
  ownerName: string,
  orderId: string,
  products: Array<{ name: string; quantity: number; price: number }>,
  customerName: string,
  paymentType?: string,
  paymentMethod?: string,
): string => {
  const subtotal = products.reduce(
    (acc, p) => acc + p.price * p.quantity,
    0,
  );

  const idParts = orderId.split("-");
  const displayId =
    idParts[0] && typeof idParts[0] === "string"
      ? idParts[0].toUpperCase()
      : "N/A";

  const esc = escapeHtml;
  const itemsHtml = products
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${esc(p.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${p.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${p.price.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${(p.quantity * p.price).toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  const paymentLabel = emailPaymentTypeLabel(paymentType, paymentMethod);
  const isImmediate = paymentType === "immediate";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#43e97b,#38f9d7);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">&iexcl;Nueva Venta Recibida!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;">
                Hola <strong>${esc(ownerName)}</strong>, <strong>${esc(customerName)}</strong> ha realizado una compra en tu emprendimiento.
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#666;">
                Orden: <strong>#${esc(displayId)}</strong>
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#888;">
                Tipo de pago: <strong>${esc(paymentLabel)}</strong>
              </p>
              ${isImmediate ? `<div style="background-color:#fff3e0;border:1px solid #ffcc02;border-radius:6px;padding:12px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#e65100;">
                  <strong>⚠️ Importante:</strong> Este es un pago inmediato. Coordina con el consumidor para recibir el pago y luego marca los items como &quot;Pago recibido&quot; desde tu panel de ventas.
                </p>
              </div>` : ""}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#f8f8f8;">
                    <th style="padding:10px;text-align:left;font-size:13px;color:#555;">Producto</th>
                    <th style="padding:10px;text-align:center;font-size:13px;color:#555;">Cant.</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Precio</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:10px;text-align:right;font-weight:bold;font-size:16px;">Tu Ganancia:</td>
                    <td style="padding:10px;text-align:right;font-weight:bold;font-size:16px;color:#43e97b;">$${subtotal.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
              Freelance LATAM &mdash; Apoyando el emprendimiento local
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const REFUND_SUBJECT = "Reembolso - Freelance LATAM";

export const refundEmailHtml = (
  items: Array<{ quantity: number; unit_price: number; products: { name: string } }>,
  total: number,
  refundType: "full" | "partial",
): string => {
  const typeLabel = refundType === "full" ? "Reembolso Total" : "Reembolso Parcial";

  const esc = escapeHtml;
  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${esc(item.products.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${item.unit_price.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${(item.quantity * item.unit_price).toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">${escapeHtml(typeLabel)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;">
                Se ha procesado un reembolso por los siguientes items:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#f8f8f8;">
                    <th style="padding:10px;text-align:left;font-size:13px;color:#555;">Producto</th>
                    <th style="padding:10px;text-align:center;font-size:13px;color:#555;">Cant.</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Precio</th>
                    <th style="padding:10px;text-align:right;font-size:13px;color:#555;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:10px;text-align:right;font-weight:bold;font-size:16px;">Total reembolsado:</td>
                    <td style="padding:10px;text-align:right;font-weight:bold;font-size:16px;color:#f5576c;">$${total.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="4" style="padding:10px;text-align:right;font-size:13px;color:#666;">Tipo: <strong>${typeLabel}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
              Freelance LATAM &mdash; Apoyando el emprendimiento local
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const LOW_STOCK_SUBJECT = "Alerta de Stock Bajo - Freelance LATAM";

export const lowStockAlertEmailHtml = (
  ownerName: string,
  productName: string,
  entrepreneurshipName: string,
  currentStock: number,
): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">Alerta de Stock Bajo</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;">
                Hola <strong>${escapeHtml(ownerName)}</strong>, uno de tus productos tiene stock bajo:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#f8f8f8;border-radius:6px;">
                <tr>
                  <td style="padding:15px;">
                    <p style="margin:0;font-size:14px;color:#666;"><strong>Producto:</strong> ${escapeHtml(productName)}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#666;"><strong>Emprendimiento:</strong> ${escapeHtml(entrepreneurshipName)}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#f5576c;"><strong>Stock actual:</strong> ${currentStock} unidades</p>
                  </td>
                </tr>
              </table>
               <p style="margin:20px 0 0;font-size:13px;color:#999;">
                 Por favor, rep&oacute;n el inventario pronto para evitar perder ventas.
               </p>
             </td>
           </tr>
           <tr>
             <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
               Freelance LATAM &mdash; Apoyando el emprendimiento local
             </td>
           </tr>
         </table>
       </td>
     </tr>
   </table>
 </body>
 </html>`;
};

export const BATCH_REFUND_SUBJECT = "Reembolsos Procesados - Freelance LATAM";

interface BatchRefundEmailItem {
  saleId: string;
  items: Array<{ quantity: number; unit_price: number; products: { name: string } }>;
  total: number;
  type: "full" | "partial";
}

export const refundBatchEmailHtml = (
  refundGroups: BatchRefundEmailItem[],
  grandTotal: number,
): string => {
  let salesHtml = "";

  refundGroups.forEach((group, index) => {
    const typeLabel = group.type === "full" ? "Reembolso Total" : "Reembolso Parcial";
    const esc = escapeHtml;
    const itemsHtml = group.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #e0e0e0;">${esc(item.products.name)}</td>
            <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${item.unit_price.toLocaleString()}</td>
            <td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">$${(item.quantity * item.unit_price).toLocaleString()}</td>
          </tr>`,
      )
      .join("");

    salesHtml += `
      <div style="margin-bottom:25px;">
        <div style="background-color:#f8f8f8;padding:12px 15px;border-radius:6px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:bold;color:#333;">Venta: #${group.saleId.slice(0, 8).toUpperCase()}</span>
            <span style="font-size:12px;color:#666;background-color:#fff;padding:4px 8px;border-radius:4px;">${typeLabel}</span>
          </div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background-color:#fafafa;">
              <th style="padding:10px;text-align:left;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Producto</th>
              <th style="padding:10px;text-align:center;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Cant.</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Precio</th>
              <th style="padding:10px;text-align:right;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px;text-align:right;font-weight:bold;font-size:14px;">Total de esta venta:</td>
              <td style="padding:10px;text-align:right;font-weight:bold;font-size:14px;color:#f5576c;">$${group.total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ${index < refundGroups.length - 1 ? '<div style="border-top:2px dashed #e0e0e0;margin:20px 0;"></div>' : ""}
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">Reembolsos Procesados</h1>
              <p style="color:#fff9ff;margin:8px 0 0;font-size:14px;">${refundGroups.length} venta${refundGroups.length === 1 ? "" : "s"} reembolsada${refundGroups.length === 1 ? "" : "s"}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              ${salesHtml}
              <div style="margin-top:20px;padding:15px;background-color:#f8f8f8;border-radius:8px;border:2px solid #f5576c;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:bold;font-size:16px;color:#333;">Total General Reembolsado:</span>
                  <span style="font-weight:bold;font-size:20px;color:#f5576c;">$${grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
              Freelance LATAM &mdash; Apoyando el emprendimiento local
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const PASSWORD_RECOVERY_SUBJECT =
  "Recuperación de Contraseña - Freelance LATAM";

// `actionLink` is intentionally not escaped: it is an href generated by Supabase,
// and escaping `&` would break its query parameters.
export const passwordRecoveryEmailHtml = (
  userName: string,
  actionLink: string,
): string => {
  const greeting = userName
    ? `Hola <strong>${escapeHtml(userName)}</strong>,`
    : "Hola,";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">Recuperaci&oacute;n de Contrase&ntilde;a</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;">
                ${greeting} recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 25px;">
                    <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;">
                      Restablecer mi contrase&ntilde;a
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#666;">
                Si el bot&oacute;n no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#667eea;word-break:break-all;">
                ${actionLink}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#f8f8f8;border-radius:6px;">
                <tr>
                  <td style="padding:15px;">
                    <p style="margin:0;font-size:13px;color:#666;">
                      Este enlace es de un solo uso y expira en poco tiempo. Si no solicitaste
                      restablecer tu contrase&ntilde;a, puedes ignorar este correo: tu contrase&ntilde;a
                      actual seguir&aacute; siendo v&aacute;lida.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8f8;padding:20px;text-align:center;font-size:12px;color:#999;">
              Freelance LATAM &mdash; Apoyando el emprendimiento local
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
