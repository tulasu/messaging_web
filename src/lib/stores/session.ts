import { writable } from 'svelte/store';

type SessionState =
	| { status: 'unknown'; email?: string }
	| { status: 'guest'; email?: string }
	| { status: 'authenticated'; email?: string };

const storedEmail =
	typeof localStorage !== 'undefined'
		? (localStorage.getItem('messaging-email') ?? undefined)
		: undefined;

export const session = writable<SessionState>({
	status: 'unknown',
	email: storedEmail
});

export function setAuthenticated(email?: string) {
	if (typeof localStorage !== 'undefined' && email) {
		localStorage.setItem('messaging-email', email);
	}
	session.set({ status: 'authenticated', email: email ?? storedEmail });
}

export function setGuest() {
	session.set({ status: 'guest', email: storedEmail });
}
