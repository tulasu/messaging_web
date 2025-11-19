<script lang="ts">
	import { goto } from '$app/navigation';
	import { createApiClient, ApiError } from '$lib/api/client';
	import { m } from '$lib/paraglide/messages.js';
	import { setAuthenticated, setGuest } from '$lib/stores/session';
	import { onMount } from 'svelte';

	let email = '';
	let displayName = '';
	let submitting = false;
	let errorMessage = '';

	const client = createApiClient();

	onMount(() => {
		const probe = async () => {
			try {
				await client.listMessages(1, 0);
				setAuthenticated(localStorage.getItem('messaging-email') ?? undefined);
				await goto('/messages');
			} catch (err) {
				if (err instanceof ApiError && err.status === 401) {
					setGuest();
					return;
				}
				console.error(err);
			}
		};

		void probe();
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			errorMessage = m.login_error_email_required();
			return;
		}

		submitting = true;
		try {
			await client.login(trimmedEmail, displayName.trim() || undefined);
			setAuthenticated(trimmedEmail);
			await goto('/messages');
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				errorMessage = m.login_error_auth_rejected();
			} else {
				errorMessage = m.login_error_generic();
			}
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_login()}</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-white">
	<div class="mx-auto flex max-w-lg flex-col gap-10 px-4 py-10">
		<header class="space-y-4">
			<p class="text-sm tracking-[0.3em] text-red-300 uppercase">{m.app_title()}</p>
			<h1 class="text-4xl leading-tight font-semibold">{m.app_subtitle()}</h1>
			<p class="text-slate-300">{m.app_description()}</p>
		</header>

		<form class="rounded-3xl bg-white/5 p-6 backdrop-blur" onsubmit={handleSubmit}>
			<div class="space-y-6">
				<label class="block text-sm font-medium text-slate-200">
					{m.email_label()}
					<input
						class="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-red-400 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
						type="email"
						placeholder={m.email_placeholder()}
						bind:value={email}
					/>
				</label>

				<label class="block text-sm font-medium text-slate-200">
					{m.display_name_label()}
					<input
						class="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-red-400 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
						type="text"
						placeholder={m.display_name_placeholder()}
						bind:value={displayName}
					/>
				</label>

				{#if errorMessage}
					<p class="text-sm text-rose-300">{errorMessage}</p>
				{/if}

				<button
					type="submit"
					class="w-full rounded-2xl bg-red-600 py-3 text-center text-base font-semibold text-red-50 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
					disabled={submitting}
				>
					{submitting ? m.login_loading() : m.login_button()}
				</button>
			</div>
		</form>
	</div>
</div>
