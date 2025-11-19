import { API_BASE_URL } from '$lib/config';
import type {
	MessageAttempt,
	MessengerKind,
	MessengerToken,
	PaginatedChatsResponse,
	PaginatedMessagesResponse,
	RegisterTokenPayload,
	SendMessagePayload
} from './types';

type Fetcher = typeof fetch;

export class ApiError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, message: string, data?: unknown) {
		super(message);
		this.status = status;
		this.data = data;
	}
}

export class ApiClient {
	private fetcher: Fetcher;
	private baseUrl: string;

	constructor(fetcher?: Fetcher, baseUrl: string = API_BASE_URL) {
		this.fetcher = fetcher ?? fetch;
		this.baseUrl = baseUrl;
	}

	private async refreshSession(): Promise<boolean> {
		const response = await this.fetcher(`${this.baseUrl}/auth/refresh`, {
			method: 'POST',
			credentials: 'include'
		});

		return response.ok;
	}

	private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
		const response = await this.fetcher(`${this.baseUrl}${path}`, {
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...(init.headers ?? {})
			},
			...init
		});

		if (response.status === 401 && retry) {
			const refreshed = await this.refreshSession();
			if (refreshed) {
				return this.request<T>(path, init, false);
			}
		}

		if (!response.ok) {
			let data: unknown;
			try {
				data = await response.json();
			} catch {
				data = await response.text();
			}

			throw new ApiError(response.status, response.statusText, data);
		}

		if (response.status === 204) {
			return undefined as T;
		}

		return (await response.json()) as T;
	}

	login(email: string, displayName?: string | null) {
		return this.request<{ success: boolean }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, display_name: displayName })
		});
	}

	listMessages(limit = 15, offset = 0) {
		const params = new URLSearchParams({
			limit: String(limit),
			offset: String(offset)
		});
		return this.request<PaginatedMessagesResponse>(`/messages?${params.toString()}`);
	}

	getMessageAttempts(messageId: string) {
		return this.request<MessageAttempt[]>(`/messages/${messageId}/attempts`);
	}

	sendMessage(payload: SendMessagePayload) {
		return this.request<{ message_id: string }>('/messages', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}

	listTokens() {
		return this.request<MessengerToken[]>('/messengers/tokens');
	}

	registerToken(payload: RegisterTokenPayload) {
		return this.request<MessengerToken>('/messengers/tokens', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}

	logout() {
		return this.request<{ success: boolean }>('/auth/logout', {
			method: 'POST'
		});
	}

	listChats(messenger: MessengerKind, limit = 20, offset = 0) {
		const params = new URLSearchParams({
			limit: String(limit),
			offset: String(offset)
		});
		return this.request<PaginatedChatsResponse>(
			`/messengers/${messenger}/chats?${params.toString()}`
		);
	}
}

export const createApiClient = (fetcher?: Fetcher) => new ApiClient(fetcher);
