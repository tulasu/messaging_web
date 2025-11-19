import { m } from '$lib/paraglide/messages.js';

export const formatDateTime = (value: string) => {
	const date = new Date(value);
	return new Intl.DateTimeFormat('ru-RU', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
};

export const messengerLabel = {
	telegram: m.messenger_telegram(),
	vk: m.messenger_vk()
} as const;

export const statusColor = {
	Pending: 'bg-amber-100 text-amber-900',
	Scheduled: 'bg-sky-100 text-sky-900',
	InFlight: 'bg-indigo-100 text-indigo-900',
	Sent: 'bg-emerald-100 text-emerald-900',
	Retrying: 'bg-purple-100 text-purple-900',
	Failed: 'bg-rose-100 text-rose-900',
	Cancelled: 'bg-gray-200 text-gray-800'
} as const;

export const statusLabel = {
	Pending: m.status_pending(),
	Scheduled: m.status_scheduled(),
	InFlight: m.status_inflight(),
	Sent: m.status_sent(),
	Retrying: m.status_retrying(),
	Failed: m.status_failed(),
	Cancelled: m.status_cancelled()
} as const;

export const chatTypeLabel = {
	direct: m.chat_type_direct(),
	group: m.chat_type_group(),
	channel: m.chat_type_channel(),
	bot: m.chat_type_bot(),
	unknown: m.chat_type_unknown()
} as const;
