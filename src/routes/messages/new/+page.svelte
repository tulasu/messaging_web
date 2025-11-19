<script lang="ts">
	import { goto } from '$app/navigation';
	import { createApiClient, ApiError } from '$lib/api/client';
	import type {
		BatchSendItemResult,
		ChatSummary,
		MessengerKind,
		MessengerToken
	} from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { messengerLabel, chatTypeLabel } from '$lib/utils/format';
	import { session, setGuest } from '$lib/stores/session';
	import { onMount } from 'svelte';
	import MobileNavDrawer from '$lib/components/MobileNavDrawer.svelte';

	const client = createApiClient();

	let tokens: MessengerToken[] = [];
	let tokensLoading = false;
	let chats: ChatSummary[] = [];
	let chatsLoading = false;
	let chatsHasMore = false;
	let chatsOffset: number | null = 0;

	let selectedMessenger: MessengerKind | '' = '';
	let selectedChat = '';
	let messageText = '';

	let errorMessage = '';
	let successMessage = '';
	let submitting = false;
	let navOpen = false;
	let recipients: RecipientEntry[] = [];
	let batchResults: BatchResultEntry[] = [];

	const allMessengers: MessengerKind[] = ['telegram', 'vk'];

	type RecipientEntry = {
		id: string;
		messenger: MessengerKind;
		chatId: string;
		chatTitle: string;
		chatType: ChatSummary['chat_type'];
	};

	type BatchResultEntry = BatchSendItemResult & { recipient?: RecipientEntry };

	onMount(() => {
		void loadTokens();
	});

	async function loadTokens() {
		tokensLoading = true;
		errorMessage = '';
		try {
			tokens = await client.listTokens();
			if (tokens.length === 0) {
				errorMessage = m.message_new_no_connections();
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.message_new_error_load_tokens();
			console.error(err);
		} finally {
			tokensLoading = false;
		}
	}

	function connectedMessengers() {
		const active = tokens
			.filter((token) => token.status === 'Active')
			.map((token) => token.messenger);
		return Array.from(new Set(active));
	}

	async function loadChats(reset = false) {
		if (!selectedMessenger || chatsLoading) return;
		chatsLoading = true;
		errorMessage = '';

		try {
			const offset = reset ? 0 : (chatsOffset ?? 0);
			const response = await client.listChats(selectedMessenger, 25, offset);
			if (reset) {
				chats = response.chats;
			} else {
				chats = [...chats, ...response.chats];
			}
			chatsHasMore = response.has_more;
			chatsOffset =
				response.next_offset ?? (response.has_more ? offset + response.chats.length : null);
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.message_new_error_load_recipients();
			console.error(err);
		} finally {
			chatsLoading = false;
		}
	}

	function handleMessengerChange(value: string) {
		selectedMessenger = value as MessengerKind;
		selectedChat = '';
		chats = [];
		chatsOffset = 0;
		chatsHasMore = false;
		batchResults = [];
		if (selectedMessenger) {
			void loadChats(true);
		}
	}

	function addRecipient() {
		errorMessage = '';
		if (!selectedMessenger || !selectedChat) {
			errorMessage = m.message_new_error_required();
			return;
		}
		if (
			recipients.some(
				(entry) => entry.messenger === selectedMessenger && entry.chatId === selectedChat
			)
		) {
			errorMessage = m.message_new_recipient_duplicate();
			return;
		}
		const chat = chats.find((c) => c.chat_id === selectedChat);
		const id =
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		recipients = [
			...recipients,
			{
				id,
				messenger: selectedMessenger,
				chatId: selectedChat,
				chatTitle: chat?.title ?? selectedChat,
				chatType: chat?.chat_type ?? 'unknown'
			}
		];
		selectedChat = '';
		batchResults = [];
	}

	function removeRecipient(id: string) {
		recipients = recipients.filter((entry) => entry.id !== id);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';
		batchResults = [];

		const trimmedText = messageText.trim();

		if (!trimmedText || recipients.length === 0) {
			errorMessage = m.message_new_error_required();
			return;
		}

		const payloads = recipients.map((entry) => ({
			messenger: entry.messenger,
			recipient: entry.chatId,
			text: trimmedText
		}));

		submitting = true;
		try {
			if (payloads.length === 1) {
				const response = await client.sendMessage(payloads[0]);
				messageText = '';
				recipients = [];
				selectedMessenger = '';
				selectedChat = '';
				await goto(`/messages/${response.message_id}`);
			} else {
				const response = await client.batchSend(payloads);
				batchResults = response.results.map((result) => ({
					...result,
					recipient: recipients[result.index] ?? undefined
				}));
				successMessage = m.message_new_batch_success({
					successful: response.successful,
					total: response.total
				});
				errorMessage =
					response.failed > 0 ? m.message_new_batch_failed({ failed: response.failed }) : '';
				messageText = '';
				recipients = [];
				selectedMessenger = '';
				selectedChat = '';
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.message_new_error_send();
			console.error(err);
		} finally {
			submitting = false;
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
	<title>{m.page_title_message_new()}</title>
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
				{m.message_new_back()}
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
			{m.message_new_back()}
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

		<section class="rounded-3xl bg-white p-6 shadow-sm">
			<header class="space-y-2">
				<p class="text-sm tracking-[0.3em] text-red-500 uppercase">
					{m.message_new_subtitle()}
				</p>
				<h1 class="text-2xl font-semibold text-slate-900">{m.message_new_title()}</h1>
				<p class="text-sm text-slate-500">{m.message_new_description()}</p>
			</header>

			{#if tokensLoading}
				<p class="mt-6 text-sm text-slate-500">{m.message_new_checking_tokens()}</p>
			{:else}
				<div class="mt-6 space-y-8">
					<div class="rounded-2xl border border-dashed border-slate-200 p-4">
						<h2 class="text-sm font-semibold text-slate-700">{m.message_new_channels_status()}</h2>
						<ul class="mt-4 space-y-3">
							{#each allMessengers as option (option)}
								<li
									class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
								>
									<div>
										<p class="font-semibold text-slate-900">{messengerLabel[option]}</p>
										{#if connectedMessengers().includes(option)}
											<p class="text-sm text-red-500">{m.message_new_connected()}</p>
										{:else}
											<p class="text-sm text-slate-500">{m.message_new_not_connected()}</p>
										{/if}
									</div>
									{#if !connectedMessengers().includes(option)}
										<button
											type="button"
											class="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
											onclick={() => void goto('/integrations/connect')}
										>
											{m.message_new_connect_button()}
										</button>
									{/if}
								</li>
							{/each}
						</ul>
					</div>

					{#if connectedMessengers().length === 0}
						<div class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
							{m.message_new_no_tokens()}
						</div>
					{:else}
						<form class="space-y-6" onsubmit={handleSubmit}>
							<label class="block text-sm font-semibold text-slate-700">
								{m.message_new_channel_label()}
								<select
									class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none"
									bind:value={selectedMessenger}
									onchange={(event) =>
										handleMessengerChange((event.target as HTMLSelectElement).value)}
								>
									<option value="">{m.message_new_channel_placeholder()}</option>
									{#each connectedMessengers() as messenger (messenger)}
										<option value={messenger}>{messengerLabel[messenger]}</option>
									{/each}
								</select>
							</label>

							{#if selectedMessenger}
								<div class="space-y-3">
									<label class="block text-sm font-semibold text-slate-700">
										{m.message_new_recipient_label()}
										<select
											class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none"
											bind:value={selectedChat}
										>
											<option value="">{m.message_new_recipient_placeholder()}</option>
											{#each chats as chat (chat.chat_id)}
												<option value={chat.chat_id}>
													{chat.title} · {chatTypeLabel[chat.chat_type]}
												</option>
											{/each}
										</select>
									</label>
									<div class="flex flex-wrap gap-3">
										<button
											type="button"
											class="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-200"
											onclick={addRecipient}
											disabled={!selectedChat}
										>
											{m.message_new_add_recipient()}
										</button>
										{#if chatsHasMore}
											<button
												type="button"
												class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
												onclick={() => loadChats()}
												disabled={chatsLoading}
											>
												{chatsLoading
													? m.message_new_loading_recipients()
													: m.message_new_load_more_recipients()}
											</button>
										{/if}
									</div>
								</div>
							{/if}

							<div class="rounded-2xl border border-slate-200 p-4">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-semibold text-slate-700">
										{m.message_new_recipients_title()}
									</h3>
									{#if recipients.length > 0}
										<span class="text-xs text-slate-500">{recipients.length}</span>
									{/if}
								</div>
								{#if recipients.length === 0}
									<p class="mt-3 text-sm text-slate-500">{m.message_new_recipients_empty()}</p>
								{:else}
									<ul class="mt-3 space-y-3">
										{#each recipients as recipient (recipient.id)}
											<li
												class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
											>
												<div>
													<p class="font-semibold text-slate-900">
														{messengerLabel[recipient.messenger]} · {recipient.chatTitle}
													</p>
													<p class="text-xs text-slate-500">
														{chatTypeLabel[recipient.chatType]}
													</p>
												</div>
												<button
													type="button"
													class="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:text-rose-600"
													onclick={() => removeRecipient(recipient.id)}
												>
													{m.message_new_remove_recipient()}
												</button>
											</li>
										{/each}
									</ul>
								{/if}
							</div>

							<label class="block text-sm font-semibold text-slate-700">
								{m.message_new_body_label()}
								<textarea
									rows="6"
									class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none"
									placeholder={m.message_new_body_placeholder()}
									bind:value={messageText}
								></textarea>
							</label>

							{#if errorMessage}
								<p class="text-sm text-rose-500">{errorMessage}</p>
							{/if}
							{#if successMessage}
								<p class="text-sm text-red-500">{successMessage}</p>
							{/if}

							<div class="flex flex-wrap gap-3">
								<button
									type="submit"
									class="flex-1 rounded-2xl bg-red-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-200"
									disabled={submitting}
								>
									{submitting ? m.message_new_submitting() : m.message_new_submit()}
								</button>
								<button
									type="button"
									class="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600"
									onclick={() => void goto('/integrations/connect')}
								>
									{m.message_new_tokens_manage()}
								</button>
							</div>
							{#if batchResults.length > 0}
								<div class="rounded-2xl border border-slate-200 p-4">
									<h3 class="text-sm font-semibold text-slate-700">
										{m.message_new_batch_results_title()}
									</h3>
									<ul class="mt-3 space-y-3">
										{#each batchResults as result (result.index)}
											<li class="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
												<div class="flex items-center justify-between gap-3">
													<div>
														<p class="font-semibold text-slate-900">
															{result.recipient
																? `${messengerLabel[result.recipient.messenger]} · ${result.recipient.chatTitle}`
																: m.message_new_batch_result_unknown()}
														</p>
														<p class="text-xs text-slate-500">
															{m.message_new_batch_result_index({
																index: result.index + 1
															})}
														</p>
													</div>
													<span
														class={`rounded-full px-3 py-1 text-xs font-semibold ${
															result.success
																? 'bg-emerald-50 text-emerald-700'
																: 'bg-rose-50 text-rose-700'
														}`}
													>
														{result.success
															? m.message_new_batch_result_success()
															: m.message_new_batch_result_failed()}
													</span>
												</div>
												{#if !result.success && result.error}
													<p class="mt-2 text-xs text-rose-600">{result.error}</p>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</form>
					{/if}
				</div>
			{/if}
		</section>
	</div>
</div>
