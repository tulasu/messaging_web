import { get, writable } from 'svelte/store';
import type { MessageHistory } from '$lib/api/types';

type MessagesState = {
	entities: Record<string, MessageHistory>;
	order: string[];
};

const initialState: MessagesState = {
	entities: {},
	order: []
};

export const messagesStore = writable<MessagesState>(initialState);

export function upsertMessages(list: MessageHistory[]) {
	messagesStore.update((state) => {
		const entities = { ...state.entities };
		const order = [...state.order];

		for (const message of list) {
			entities[message.id] = message;
			if (!order.includes(message.id)) {
				order.push(message.id);
			}
		}

		return { entities, order };
	});
}

export function getMessageFromStore(id: string) {
	const state = get(messagesStore);
	return state.entities[id];
}

export function clearMessages() {
	messagesStore.set(initialState);
}
