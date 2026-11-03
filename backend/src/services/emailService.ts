import { Resend } from "resend";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

let client: Resend | null = null;

function getResend(): Resend {
  if (!env.resendApiKey) {
    throw new AppError("El envío de correos no está configurado.", 503);
  }

  if (!client) {
    client = new Resend(env.resendApiKey);
  }

  return client;
}

function getEmailFrom(): string {
  if (!env.emailFrom) {
    throw new AppError("El remitente de correos no está configurado.", 503);
  }

  return env.emailFrom;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const resend = getResend();
  const from = getEmailFrom();

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`[EmailService] Correo enviado a ${options.to}: id=${data?.id}`);
}
