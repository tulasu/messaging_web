<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createApiClient, ApiError } from '$lib/api/client';
	import type { MessageAttempt, MessageHistory } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getMessageFromStore, upsertMessages } from '$lib/stores/messages';
	import { session, setGuest } from '$lib/stores/session';
	import { formatDateTime, messengerLabel, statusColor, statusLabel } from '$lib/utils/format';
	import MobileNavDrawer from '$lib/components/MobileNavDrawer.svelte';
	import { onDestroy } from 'svelte';

	const client = createApiClient();

	let messageId = '';
	let message: MessageHistory | null = null;
	let attempts: MessageAttempt[] = [];
	let loading = false;
	let errorMessage = '';
	let navOpen = false;

	const unsubscribe = page.subscribe(($page) => {
		const nextId = $page.params.id;
		if (nextId && nextId !== messageId) {
			messageId = nextId;
			void loadData(nextId);
		}
	});

	onDestroy(unsubscribe);

	async function fetchMessageById(id: string): Promise<MessageHistory> {
		const cached = getMessageFromStore(id);
		if (cached) return cached;

		let offset = 0;
		const limit = 20;
		const iterations = 5;

		for (let i = 0; i < iterations; i++) {
			const response = await client.listMessages(limit, offset);
			upsertMessages(response.messages);
			const found = response.messages.find((entry) => entry.id === id);
			if (found) return found;
			if (!response.has_more || response.next_offset === null) break;
			offset = response.next_offset;
		}

		throw new Error(m.message_detail_not_found());
	}

	async function loadData(id: string) {
		loading = true;
		errorMessage = '';

		try {
			message = await fetchMessageById(id);
			attempts = await client.getMessageAttempts(id);
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = err instanceof Error ? err.message : m.message_detail_error_load();
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function handleLogout() {
		try {
			await client.logout();
		} catch (err) {
			console.error(err);
		} finally {
			setGuest();
			await goto('/');
		}
	}
</script>

<svelte:head>
	<title>
		{message
			? m.page_title_message_detail({ id: message.id.slice(0, 8) })
			: m.page_title_message_detail({ id: messageId.slice(0, 8) || '...' })}
	</title>
</svelte:head>

<div class="px-4 py-6 sm:px-6 lg:px-8">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<div class="flex items-center justify-between md:hidden">
			<button
				type="button"
				class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
				onclick={() => void goto('/messages')}
			>
				<span aria-hidden="true">←</span>
				{m.message_detail_back()}
			</button>
			<button
				type="button"
				class="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
				onclick={() => (navOpen = true)}
				aria-label={m.nav_menu_label()}
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
		</div>
		<button
			type="button"
			class="hidden items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 md:inline-flex"
			onclick={() => void goto('/messages')}
		>
			<span aria-hidden="true">←</span>
			{m.message_detail_back()}
		</button>

		<MobileNavDrawer
			open={navOpen}
			onClose={() => (navOpen = false)}
			onNavigate={(path) => {
				navOpen = false;
				void goto(path);
			}}
			displayName={$session.displayName}
			onLogout={async () => {
				navOpen = false;
				await handleLogout();
			}}
		/>

		{#if loading}
			<div class="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
				{m.message_detail_loading()}
			</div>
		{:else if errorMessage}
			<div class="rounded-3xl bg-rose-50 p-6 text-rose-700 shadow-sm">{errorMessage}</div>
		{:else if message}
			<section class="space-y-6">
				<div class="rounded-3xl bg-white p-6 shadow-sm">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div>
							<p class="text-sm tracking-[0.3em] text-red-500 uppercase">
								{messengerLabel[message.messenger]}
							</p>
							<h1 class="mt-2 text-3xl font-semibold text-slate-900">
								{m.message_detail_title({ id: message.id.slice(0, 8) })}
							</h1>
							<p class="mt-2 text-sm text-slate-500">
								{m.message_detail_recipient()}: {message.recipient}
							</p>
						</div>
						<span
							class={`rounded-full px-4 py-1 text-sm font-semibold ${statusColor[message.status]}`}
							>{statusLabel[message.status]}</span
						>
					</div>

					<div class="mt-6 space-y-4 text-sm text-slate-600">
						<div>
							<p class="text-xs text-slate-400 uppercase">{m.message_detail_created()}</p>
							<p class="text-base text-slate-900">{formatDateTime(message.created_at)}</p>
						</div>
						<div>
							<p class="text-xs text-slate-400 uppercase">{m.message_detail_updated()}</p>
							<p class="text-base text-slate-900">{formatDateTime(message.updated_at)}</p>
						</div>
						<div>
							<p class="text-xs text-slate-400 uppercase">{m.message_detail_body()}</p>
							<p class="rounded-2xl bg-slate-50 p-4 text-base whitespace-pre-wrap text-slate-900">
								{message.body}
							</p>
						</div>
						{#if message.last_error}
							<div>
								<p class="text-xs text-slate-400 uppercase">{m.message_detail_last_error()}</p>
								<p class="text-base text-rose-500">{message.last_error}</p>
							</div>
						{/if}
					</div>
				</div>

				<div class="rounded-3xl bg-white p-6 shadow-sm">
					<h2 class="text-xl font-semibold text-slate-900">{m.message_detail_history_title()}</h2>
					{#if attempts.length === 0}
						<p class="mt-4 text-sm text-slate-500">{m.message_detail_history_empty()}</p>
					{:else}
						<ul class="mt-4 space-y-4">
							{#each attempts as attempt (attempt.id)}
								<li class="rounded-2xl border border-slate-100 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3 text-sm">
										<div class="flex items-center gap-2 text-slate-500">
											<span
												class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700"
												>{attempt.attempt_number}</span
											>
											<div class="flex flex-col gap-1">
												<p class="text-xs text-slate-400 uppercase">
													{m.message_detail_status_label()}
												</p>
												<span
													class={`rounded-full px-3 py-1 text-xs font-semibold ${
														statusColor[attempt.status] ?? 'bg-slate-100 text-slate-600'
													}`}
												>
													{statusLabel[attempt.status]}
												</span>
											</div>
										</div>
										<span class="text-xs text-slate-400">{formatDateTime(attempt.created_at)}</span>
									</div>
									{#if attempt.status_reason}
										<p class="mt-3 text-sm text-rose-500">{attempt.status_reason}</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</div>
