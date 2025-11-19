import { writable } from 'svelte/store';

type SessionState =
	| { status: 'unknown'; email?: string; displayName?: string }
	| { status: 'guest'; email?: string; displayName?: string }
	| { status: 'authenticated'; email?: string; displayName?: string };

const storedEmail =
	typeof localStorage !== 'undefined'
		? (localStorage.getItem('messaging-email') ?? undefined)
		: undefined;

const storedDisplayName =
	typeof localStorage !== 'undefined'
		? (localStorage.getItem('messaging-display-name') ?? undefined)
		: undefined;

export const session = writable<SessionState>({
	status: 'unknown',
	email: storedEmail,
	displayName: storedDisplayName
});

export function setAuthenticated(email?: string, displayName?: string) {
	if (typeof localStorage !== 'undefined') {
		if (email) {
			localStorage.setItem('messaging-email', email);
		}
		if (displayName) {
			localStorage.setItem('messaging-display-name', displayName);
		} else if (displayName === null) {
			localStorage.removeItem('messaging-display-name');
		}
	}
	session.set({
		status: 'authenticated',
		email: email ?? storedEmail,
		displayName: displayName ?? storedDisplayName
	});
}

export function setGuest() {
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('messaging-display-name');
	}
	session.set({ status: 'guest', email: storedEmail, displayName: undefined });
}
