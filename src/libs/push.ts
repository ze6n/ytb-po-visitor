import { logger } from "./logger";
import { formatError } from "./utils";

export interface PushTokensPayload {
	visitorData: string;
	poToken: string;
}

export interface PushResult {
	success: boolean;
	status?: number;
	error?: string;
}

/**
 * Push generated YouTube visitor data and poToken to a remote endpoint.
 *
 * Supported environment variables:
 * - TARGET_ENDPOINT_URL: Target endpoint URL (e.g. http://localhost:2333/youtube)
 * - TARGET_ENDPOINT_AUTH: Optional authorization secret sent in Authorization header
 */
export async function pushTokens(
	tokens: PushTokensPayload,
	targetUrlOverride?: string,
): Promise<PushResult> {
	const targetUrl =
		targetUrlOverride || process.env.TARGET_ENDPOINT_URL?.trim();

	if (!targetUrl) {
		logger.info(
			"TARGET_ENDPOINT_URL is not configured; skipping automatic push",
		);
		return {
			success: false,
			error: "TARGET_ENDPOINT_URL is not configured",
		};
	}

	const auth = process.env.TARGET_ENDPOINT_AUTH?.trim();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (auth) {
		headers.Authorization = auth;
	}

	const payload = {
		poToken: tokens.poToken,
		visitorData: tokens.visitorData,
	};

	logger.info(`Pushing tokens to endpoint: ${targetUrl}`);

	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});

		if (response.ok) {
			logger.success(
				`Successfully pushed tokens to ${targetUrl} (HTTP ${response.status})`,
			);
			return {
				success: true,
				status: response.status,
			};
		}

		const responseText = await response.text().catch(() => "");
		const errorMsg = `HTTP ${response.status} ${response.statusText}${
			responseText ? `: ${responseText}` : ""
		}`;
		logger.error(`Failed to push tokens to ${targetUrl} (${errorMsg})`);
		return {
			success: false,
			status: response.status,
			error: errorMsg,
		};
	} catch (error) {
		const errorMsg = formatError(error);
		logger.error(`Error connecting to endpoint ${targetUrl}: ${errorMsg}`);
		return {
			success: false,
			error: errorMsg,
		};
	}
}
