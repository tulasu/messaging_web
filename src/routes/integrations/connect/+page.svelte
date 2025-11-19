<script lang="ts">
	import { goto } from '$app/navigation';
	import { createApiClient, ApiError } from '$lib/api/client';
	import type { MessengerKind, MessengerToken } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { messengerLabel, formatDateTime } from '$lib/utils/format';
	import { setGuest } from '$lib/stores/session';
	import { onMount } from 'svelte';

	const client = createApiClient();

	let tokens: MessengerToken[] = [];
	let loading = false;
	let errorMessage = '';
	let successMessage = '';

	let messenger: MessengerKind = 'telegram';
	let accessToken = '';
	let refreshToken = '';
	let submitting = false;

	onMount(() => {
		void loadTokens();
	});

	async function loadTokens() {
		loading = true;
		errorMessage = '';
		try {
			tokens = await client.listTokens();
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.integrations_error_load();
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		if (!accessToken.trim()) {
			errorMessage = m.integrations_error_required();
			return;
		}

		submitting = true;
		try {
			await client.registerToken({
				messenger,
				access_token: accessToken.trim(),
				refresh_token: refreshToken.trim() || undefined
			});
			successMessage = m.integrations_success();
			accessToken = '';
			refreshToken = '';
			await loadTokens();
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				setGuest();
				await goto('/');
				return;
			}
			errorMessage = m.integrations_error_save();
			console.error(err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
	<div class="mx-auto flex max-w-3xl flex-col gap-6">
		<button
			type="button"
			class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
			onclick={() => void goto('/messages')}
		>
			<span aria-hidden="true">←</span>
			{m.integrations_back()}
		</button>

		<section class="rounded-3xl bg-white p-6 shadow-sm">
			<header class="space-y-2">
				<p class="text-sm tracking-[0.3em] text-emerald-500 uppercase">
					{m.integrations_subtitle()}
				</p>
				<h1 class="text-2xl font-semibold text-slate-900">{m.integrations_title()}</h1>
				<p class="text-sm text-slate-500">{m.integrations_description()}</p>
			</header>

			<div class="mt-6 space-y-8">
				<div>
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-slate-900">{m.integrations_connected_title()}</h2>
						<button
							type="button"
							class="text-sm font-semibold text-emerald-600"
							onclick={() => loadTokens()}
						>
							{m.integrations_refresh()}
						</button>
					</div>

					{#if loading}
						<p class="mt-4 text-sm text-slate-500">{m.integrations_loading()}</p>
					{:else if tokens.length === 0}
						<p class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
							{m.integrations_empty()}
						</p>
					{:else}
						<ul class="mt-4 space-y-3">
							{#each tokens as token (token.id)}
								<li class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
									<div class="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p class="text-base font-semibold text-slate-900">
												{messengerLabel[token.messenger]}
											</p>
											<p class="text-xs text-slate-400">
												{m.integrations_updated()}
												{formatDateTime(token.updated_at)}
											</p>
										</div>
										<span
											class={`rounded-full px-3 py-1 text-xs font-semibold ${
												token.status === 'Active'
													? 'bg-emerald-100 text-emerald-900'
													: 'bg-slate-200 text-slate-600'
											}`}
										>
											{token.status === 'Active'
												? m.integrations_status_active()
												: m.integrations_status_inactive()}
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<form class="space-y-5" onsubmit={handleSubmit}>
					<h2 class="text-lg font-semibold text-slate-900">{m.integrations_add_title()}</h2>
					<label class="block text-sm font-semibold text-slate-700">
						{m.integrations_messenger_label()}
						<select
							class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
							bind:value={messenger}
						>
							<option value="telegram">{m.messenger_telegram()}</option>
							<option value="vk">{m.messenger_vk()}</option>
						</select>
					</label>

					<label class="block text-sm font-semibold text-slate-700">
						{m.integrations_access_token_label()}
						<input
							class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
							type="text"
							placeholder="..."
							bind:value={accessToken}
						/>
					</label>

					<label class="block text-sm font-semibold text-slate-700">
						{m.integrations_refresh_token_label()}
						<input
							class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
							type="text"
							placeholder="..."
							bind:value={refreshToken}
						/>
					</label>

					{#if errorMessage}
						<p class="text-sm text-rose-500">{errorMessage}</p>
					{/if}
					{#if successMessage}
						<p class="text-sm text-emerald-600">{successMessage}</p>
					{/if}

					<button
						type="submit"
						class="w-full rounded-2xl bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200"
						disabled={submitting}
					>
						{submitting ? m.integrations_submitting() : m.integrations_submit()}
					</button>
				</form>
			</div>
		</section>
	</div>
</div>
