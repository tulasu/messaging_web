export type MessengerKind = 'telegram' | 'vk';

export type MessageStatus =
	| 'Pending'
	| 'Scheduled'
	| 'InFlight'
	| 'Sent'
	| 'Retrying'
	| 'Failed'
	| 'Cancelled';

export type RequestedBy = 'system' | 'user';

export interface MessageHistory {
	id: string;
	messenger: MessengerKind;
	recipient: string;
	status: MessageStatus;
	attempts: number;
	body: string;
	last_error: string | null;
	requested_by: RequestedBy;
	created_at: string;
	updated_at: string;
}

export interface PaginatedMessagesResponse {
	messages: MessageHistory[];
	has_more: boolean;
	next_offset: number | null;
}

export interface MessageAttempt {
	id: string;
	message_id: string;
	attempt_number: number;
	status: MessageStatus;
	status_reason: string | null;
	requested_by: RequestedBy;
	created_at: string;
}

export interface MessengerToken {
	id: string;
	messenger: MessengerKind;
	status: 'Active' | 'Inactive';
	updated_at: string;
}

export interface ChatSummary {
	messenger: MessengerKind;
	chat_id: string;
	title: string;
	chat_type: 'direct' | 'group' | 'channel' | 'bot' | 'unknown';
	can_send_messages: boolean;
}

export interface PaginatedChatsResponse {
	chats: ChatSummary[];
	has_more: boolean;
	next_offset: number | null;
}

export interface SendMessagePayload {
	messenger: MessengerKind;
	recipient: string;
	text: string;
	requested_by?: RequestedBy;
}

export interface RegisterTokenPayload {
	messenger: MessengerKind;
	access_token: string;
	refresh_token?: string;
}
