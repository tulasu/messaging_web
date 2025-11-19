<script lang="ts">
	import { goto } from '$app/navigation';
	import { createApiClient, ApiError } from '$lib/api/client';
	import type { MessageHistory } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { clearMessages, upsertMessages } from '$lib/stores/messages';
	import { setGuest } from '$lib/stores/session';
	import { formatDateTime, messengerLabel, statusColor, statusLabel } from '$lib/utils/format';
	import { onMount } from 'svelte';

	const client = createApiClient();
	const PAGE_SIZE = 15;

	let messages: MessageHistory[] = [];
	let loading = false;
	let initialised = false;
	let errorMessage = '';
	let hasMore = false;
	let nextOffset: number | null = 0;

	onMount(() => {
		clearMessages();
		void loadMessages(true);
	});

	async function loadMessages(initial = false) {
		if (loading) return;
		loading = true;

		try {
			const offset = initial ? 0 : (nextOffset ?? 0);
			const response = await client.listMessages(PAGE_SIZE, offset);
			if (initial) {
				messages = response.messages;
			} else {
				messages = [...messages, ...response.messages];
			}
			upsertMessages(response.messages);
			hasMore = response.has_more;
			nextOffset = response.next_offset ?? (response.has_more ? offset + PAGE_SIZE : null);
			initialised = true;
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.messages_error_load();
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function openDetails(id: string) {
		void goto(`/messages/${id}`);
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

<div class="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="space-y-2 rounded-3xl bg-white px-6 py-5 shadow-sm">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<p class="text-sm tracking-[0.3em] text-emerald-500 uppercase">
						{m.messages_inbox_label()}
					</p>
					<h1 class="text-2xl font-semibold text-slate-900">{m.messages_title()}</h1>
					<p class="text-sm text-slate-500">{m.messages_subtitle()}</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						class="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
						onclick={() => void goto('/integrations/connect')}
					>
						{m.messages_integrations_button()}
					</button>
					<button
						type="button"
						class="rounded-2xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
						onclick={() => void goto('/messages/new')}
					>
						{m.messages_create_button()}
					</button>
					<button
						type="button"
						class="rounded-2xl border border-transparent px-5 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
						onclick={handleLogout}
					>
						{m.messages_logout_button()}
					</button>
				</div>
			</div>
		</header>

		{#if !initialised && loading}
			<div class="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
				{m.messages_loading()}
			</div>
		{:else if errorMessage}
			<div class="rounded-3xl bg-rose-50 p-6 text-slate-700">{errorMessage}</div>
		{:else if messages.length === 0}
			<div class="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
				{m.messages_empty()}
			</div>
		{:else}
			<ul class="space-y-4">
				{#each messages as message (message.id)}
					<li>
						<button
							class="w-full rounded-3xl border border-slate-100 bg-white p-5 text-left transition hover:border-emerald-200 hover:shadow-md"
							onclick={() => openDetails(message.id)}
						>
							<div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
								<span class="font-semibold text-slate-900">{messengerLabel[message.messenger]}</span
								>
								<span>{formatDateTime(message.updated_at)}</span>
							</div>
							<div class="mt-3 inline-flex items-center gap-2">
								<span
									class={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[message.status]}`}
									>{statusLabel[message.status]}</span
								>
								<span class="text-xs text-slate-400">
									{m.messages_attempts_label()}: {message.attempts}
								</span>
							</div>
							<p class="mt-3 text-sm tracking-wide text-slate-400 uppercase">{message.recipient}</p>
							<p class="mt-2 line-clamp-3 text-base text-slate-700">{message.body}</p>
							{#if message.last_error}
								<p class="mt-2 text-sm text-rose-500">
									{m.messages_error_prefix()}: {message.last_error}
								</p>
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			{#if hasMore}
				<button
					class="mt-6 w-full rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => loadMessages()}
					disabled={loading}
				>
					{loading ? m.messages_loading_more() : m.messages_load_more()}
				</button>
			{/if}
		{/if}
	</div>
</div>
