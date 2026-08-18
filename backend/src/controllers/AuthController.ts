import type { Request, Response } from "express";
import z from "zod";
import { supabaseAdmin } from "../db.js";
import {
	ACCOUNT_INVITE_SUBJECT,
	accountInviteEmailHtml,
	PASSWORD_RECOVERY_SUBJECT,
	passwordRecoveryEmailHtml,
} from "../schemas/emailTemplates.js";
import { signupRequestTemplate } from "../schemas/slackTemplates.js";
import { findAuthUserByEmail } from "../services/authUserService.js";
import { sendEmail } from "../services/emailService.js";
import { sendSlackWebhookNotification } from "../services/slackService.js";

const ForgotPasswordSchema = z.object({
	email: z.email("Correo electrónico inválido"),
});

// Generic reply used for every outcome that depends on whether the account
// exists, so the endpoint cannot be used to enumerate registered emails.
const RECOVERY_GENERIC_MESSAGE =
	"Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.";

const RECOVERY_SEND_ERROR =
	"No se pudo enviar el correo de recuperación. Intenta de nuevo más tarde.";

// The account already exists in Auth when this shows up, so IT should not retry
// the approval: the user can finish activating it from the recovery flow.
const INVITE_SEND_WARNING =
	'La cuenta fue creada, pero no se pudo enviar el correo de invitación. Pídele al usuario que active su cuenta desde "¿Olvidaste tu contraseña?".';

export async function SignupRequest(req: Request, res: Response) {
	try {
		const { email, user_name, entrepreneurship_name, role } = req.body;

		if (!email || !user_name || !role)
			return res
				.status(400)
				.json({ error: "Los campos de email, nombre y rol son obligatorios" });

		const rolesArray = Array.isArray(role) ? role : [role];

		const normalizedEmail = email.toLowerCase().trim();

		const { data: existingRequests, error: existingError } = await supabaseAdmin
			.from("signup_request")
			.select("id, status, created_at")
			.eq("email", normalizedEmail)
			.in("status", ["PENDIENTE", "APROBADO"])
			.order("created_at", { ascending: false });

		if (existingError)
			return res.status(400).json({ error: existingError.message });

		// Rows are ordered newest first, so find() returns the latest row per status.
		const approvedRequest = existingRequests?.find(
			(request) => request.status === "APROBADO",
		);

		if (approvedRequest) {
			// An approved row only proves the account existed at some point: it is never
			// cleaned up when IT deletes the user, so Supabase Auth is the source of
			// truth for whether the account is still around.
			let accountExists = true;
			try {
				accountExists = (await findAuthUserByEmail(normalizedEmail)) !== null;
			} catch (lookupError) {
				// Fail closed: a transient Auth outage must not let duplicates through.
				const lookupMessage =
					lookupError instanceof Error
						? lookupError.message
						: "Error desconocido";
				console.error(
					`[SignupRequest] No se pudo verificar ${normalizedEmail} en Auth: ${lookupMessage}`,
				);
			}

			if (accountExists) {
				return res.status(400).json({
					error: "Ya existe una cuenta asociada a este correo",
				});
			}

			console.info(
				`[SignupRequest] Solicitud aprobada ${approvedRequest.id} obsoleta: la cuenta de ${normalizedEmail} ya no existe en Auth`,
			);
		}

		const pendingRequest = existingRequests?.find(
			(request) => request.status === "PENDIENTE",
		);

		if (pendingRequest) {
			const requestAge =
				Date.now() - new Date(pendingRequest.created_at).getTime();
			const oneDayMs = 24 * 60 * 60 * 1000;
			if (requestAge < oneDayMs) {
				const hoursRemaining = Math.ceil(
					(oneDayMs - requestAge) / (60 * 60 * 1000),
				);
				return res.status(429).json({
					error: `Ya tienes una solicitud pendiente. Espera ${hoursRemaining} hora(s) antes de enviar otra.`,
				});
			}
		}

		const { error } = await supabaseAdmin.from("signup_request").insert([
			{
				email: normalizedEmail,
				user_name,
				entrepreneurship_name,
				role: rolesArray,
			},
		]);

		if (error) return res.status(400).json({ error: error.message });

		const webhookUrl = process.env.SLACK_WEBHOOK_URL_IT;
		if (webhookUrl) {
			const template = signupRequestTemplate(
				user_name,
				email,
				entrepreneurship_name || "",
				rolesArray,
			);
			await sendSlackWebhookNotification(webhookUrl, template);
		}

		res.status(201).json({ message: "Successful signup request " });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al procesar la solicitud de registro";
		console.error("Error en SignupRequest:", errorMessage);
		res.status(500).json({ error: "Error al crear la solicitud de acceso" });
	}
}

export async function GetPendingRequests(_req: Request, res: Response) {
	try {
		// Consultamos la tabla filtrando por el estado que consideres "pendiente"
		// Si no tienes una columna de status, puedes quitar el .eq()
		const { data, error } = await supabaseAdmin
			.from("signup_request")
			.select("*")
			.eq("status", "PENDIENTE") // Ajusta el string según tu base de datos
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		return res.status(200).json(data);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al consultar las solicitudes pendientes";
		console.error("Error fetching pending requests:", errorMessage);
		return res.status(500).json({ error: "Error al obtener las solicitudes de registro" });
	}
}

export async function ApproveSignup(req: Request, res: Response) {
	const { requestId } = req.params; // El ID de la tabla signup_request

	try {
		// 1. Obtener los datos de la solicitud
		const { data: request, error: fetchError } = await supabaseAdmin
			.from("signup_request")
			.select("*")
			.eq("id", requestId)
			.single();
		if (fetchError || !request) {
			return res.status(404).json({ error: "Solicitud no encontrada" });
		}

		const appUrl = process.env.APP_URL;
		if (!appUrl) {
			console.error("[ApproveSignup] Falta la variable de entorno APP_URL");
			return res
				.status(500)
				.json({ error: "Error al aprobar la solicitud de acceso" });
		}

		// 2. Crear el usuario en Supabase Auth
		const rolesArray = Array.isArray(request.role)
			? request.role
			: [request.role];
		const email = request.email.toLowerCase().trim();

		// generateLink creates the user and builds the invite link WITHOUT sending any
		// email, so we can deliver it through Resend instead of Supabase's built-in mailer.
		const { data, error: authError } =
			await supabaseAdmin.auth.admin.generateLink({
				type: "invite",
				email,
				options: {
					data: {
						name: request.user_name,
						entrepreneurship_name: request.entrepreneurship_name,
						roles: rolesArray,
					},
					redirectTo: `${appUrl}/reset-password`,
				},
			});

		const actionLink = data?.properties?.action_link;
		if (authError || !actionLink) {
			const authMessage = authError?.message ?? "sin action_link";
			console.error(
				`[ApproveSignup] No se generó la invitación para ${email}: ${authMessage}`,
			);
			const alreadyRegistered = authMessage
				.toLowerCase()
				.includes("already been registered");
			return res.status(400).json({
				error: alreadyRegistered
					? "Ya existe una cuenta asociada a este correo"
					: "No se pudo crear la cuenta del usuario",
			});
		}

		// 3. Marcar la solicitud como aprobada. La cuenta ya existe en Auth, así que
		// dejarla pendiente haría que cualquier reintento choque con "ya registrado".
		await supabaseAdmin
			.from("signup_request")
			.update({ status: "APROBADO" }) // Asegúrate de tener este ENUM o columna
			.eq("id", requestId);

		// 4. Enviar la invitación por Resend
		const metadataName =
			typeof request.user_name === "string" ? request.user_name : "";

		try {
			await sendEmail({
				to: email,
				subject: ACCOUNT_INVITE_SUBJECT,
				html: accountInviteEmailHtml(metadataName, actionLink),
			});
		} catch (sendError) {
			const sendMessage =
				sendError instanceof Error ? sendError.message : "Error desconocido";
			console.error(
				`[ApproveSignup] Falló el envío de la invitación a ${email}: ${sendMessage}`,
			);
			return res.status(200).json({
				message: "Proveedor aprobado",
				warning: INVITE_SEND_WARNING,
				user: data.user,
			});
		}

		res.status(200).json({
			message: "Proveedor aprobado y correo de invitación enviado",
			user: data.user,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al aprobar la solicitud e invitar al usuario";
		console.error("Error en ApproveSignup:", errorMessage);
		res.status(500).json({ error: "Error al aprobar la solicitud de acceso" });
	}
}

export async function RejectSignup(req: Request, res: Response) {
	const { requestId } = req.params;

	try {
		// Actualizamos el estado a RECHAZADO (o el valor exacto de tu ENUM)
		const { data, error } = await supabaseAdmin
			.from("signup_request")
			.update({ status: "RECHAZADO" }) // Asegúrate de que coincida con tu tipo ENUM
			.eq("id", requestId)
			.select()
			.single();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		if (!data) {
			return res.status(404).json({ error: "Solicitud no encontrada" });
		}

		res.status(200).json({ message: "Solicitud rechazada correctamente" });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al actualizar el estado de la solicitud";
		console.error("Error en RejectSignup:", errorMessage);
		res.status(500).json({ error: "Error al rechazar la solicitud" });
	}
}

export async function Login(req: Request, res: Response) {
	const { email, password } = req.body;

	try {
		// 1. Validar que vengan los datos
		if (!email || !password) {
			return res
				.status(400)
				.json({ error: "Email y contraseña son requeridos" });
		}

		// 2. Intentar inicio de sesión en Supabase Auth
		const { data, error } = await supabaseAdmin.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			const isInvalidCreds = error.message?.includes("Invalid login credentials");
			return res.status(401).json({
				error: isInvalidCreds
					? "Credenciales inválidas"
					: "Error al iniciar sesión",
			});
		}

		// 3. Si es exitoso, devolvemos la sesión y el usuario
		// El 'session' contiene el access_token que usará el frontend
		return res.status(200).json({
			message: "Login exitoso",
			session: data.session,
			user: data.user,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al verificar las credenciales";
		console.error("Login error:", errorMessage);
		return res.status(500).json({ error: "Error al iniciar sesión" });
	}
}

export async function ForgotPassword(req: Request, res: Response) {
	try {
		const parsed = ForgotPasswordSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: "Correo electrónico inválido" });
		}

		const email = parsed.data.email.toLowerCase().trim();

		const appUrl = process.env.APP_URL;
		if (!appUrl) {
			console.error("[ForgotPassword] Falta la variable de entorno APP_URL");
			return res.status(500).json({ error: RECOVERY_SEND_ERROR });
		}

		// generateLink builds the recovery link WITHOUT sending any email, so we can
		// deliver it through Resend instead of Supabase's built-in mailer.
		const { data, error } = await supabaseAdmin.auth.admin.generateLink({
			type: "recovery",
			email,
			options: { redirectTo: `${appUrl}/reset-password` },
		});

		const actionLink = data?.properties?.action_link;
		if (error || !actionLink) {
			// Usually the account does not exist. Log the real reason but reply with
			// the generic message so the response is identical either way.
			console.warn(
				`[ForgotPassword] No se generó enlace para ${email}: ${error?.message ?? "sin action_link"}`,
			);
			return res.status(200).json({ message: RECOVERY_GENERIC_MESSAGE });
		}

		const metadataName = data.user?.user_metadata?.name;
		const userName = typeof metadataName === "string" ? metadataName : "";

		try {
			await sendEmail({
				to: email,
				subject: PASSWORD_RECOVERY_SUBJECT,
				html: passwordRecoveryEmailHtml(userName, actionLink),
			});
		} catch (sendError) {
			const sendMessage =
				sendError instanceof Error ? sendError.message : "Error desconocido";
			console.error(
				`[ForgotPassword] Falló el envío del correo a ${email}: ${sendMessage}`,
			);
			return res.status(500).json({ error: RECOVERY_SEND_ERROR });
		}

		return res.status(200).json({ message: RECOVERY_GENERIC_MESSAGE });
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Error al procesar la solicitud de recuperación";
		console.error("Error en ForgotPassword:", errorMessage);
		return res.status(500).json({ error: RECOVERY_SEND_ERROR });
	}
}
