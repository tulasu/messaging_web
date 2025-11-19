<script lang="ts">
	import { goto } from '$app/navigation';
	import { createApiClient, ApiError } from '$lib/api/client';
	import type { MessageHistory } from '$lib/api/types';
	import MobileNavDrawer from '$lib/components/MobileNavDrawer.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { clearMessages, upsertMessages } from '$lib/stores/messages';
	import { session, setGuest } from '$lib/stores/session';
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
	let navOpen = false;

	const iconPaths = {
		cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
		plus: 'M12 4.5v15m7.5-7.5h-15',
		logout:
			'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m6 0l3.75-3.75L21 7.5m3 3.75H12'
	} as const;

	const headerActions = [
		{
			icon: 'cog',
			label: () => m.messages_integrations_button(),
			onClick: () => void goto('/integrations/connect')
		},
		{
			icon: 'plus',
			label: () => m.messages_create_button(),
			onClick: () => void goto('/messages/new')
		},
		{
			icon: 'logout',
			label: () => m.messages_logout_button(),
			onClick: () => void handleLogout()
		}
	] as const;

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

<svelte:head>
	<title>{m.page_title_messages()}</title>
</svelte:head>

<div class="px-4 py-6 sm:px-6 lg:px-8">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="rounded-3xl bg-white px-6 py-5 shadow-sm">
			<div class="flex items-start justify-between gap-4 md:justify-start">
				<div class="flex-1">
					<p class="text-sm tracking-[0.3em] text-red-500 uppercase">
						{m.messages_inbox_label()}
					</p>
					<h1 class="text-2xl font-semibold text-slate-900">{m.messages_title()}</h1>
					<p class="text-sm text-slate-500">{m.messages_subtitle()}</p>
					{#if $session.displayName}
						<p class="mt-1 text-xs text-slate-400">
							{m.messages_user_label()}: {$session.displayName}
						</p>
					{/if}
				</div>
				<button
					type="button"
					class="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 md:hidden"
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
				<div class="hidden flex-wrap items-center gap-2 md:flex md:self-start">
					{#each headerActions as action (action.icon)}
						<button
							type="button"
							class="group flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-slate-600 shadow-sm transition hover:border-red-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
							onclick={action.onClick}
							aria-label={action.label()}
						>
							<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d={iconPaths[action.icon]}
								/>
							</svg>
							<span
								class="max-w-0 overflow-hidden text-sm font-semibold opacity-0 transition-all duration-150 group-hover:ml-2 group-hover:max-w-xs group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-xs group-focus-visible:opacity-100"
							>
								{action.label()}
							</span>
						</button>
					{/each}
				</div>
			</div>
		</header>

		<MobileNavDrawer
			open={navOpen}
			onClose={() => (navOpen = false)}
			onNavigate={(path) => {
				navOpen = false;
				void goto(path);
			}}
			onLogout={handleLogout}
			displayName={$session.displayName}
		/>

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
							class="w-full rounded-3xl border border-slate-100 bg-white p-5 text-left transition hover:border-red-200 hover:shadow-md"
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
					class="mt-6 w-full rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => loadMessages()}
					disabled={loading}
				>
					{loading ? m.messages_loading_more() : m.messages_load_more()}
				</button>
			{/if}
		{/if}
	</div>
</div>
