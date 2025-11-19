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
	Pending: 'bg-amber-50 text-amber-700',
	Scheduled: 'bg-sky-50 text-sky-700',
	InFlight: 'bg-indigo-50 text-indigo-700',
	Sent: 'bg-emerald-50 text-emerald-700',
	Retrying: 'bg-purple-50 text-purple-700',
	Failed: 'bg-rose-100 text-rose-700',
	Cancelled: 'bg-gray-100 text-gray-600'
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
