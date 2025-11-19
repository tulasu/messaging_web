<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	export let open = false;
	export let onClose: () => void = () => {};
	export let onNavigate: (path: string) => void = () => {};
	export let onLogout: () => void = () => {};
	export let displayName: string | undefined = undefined;

	const navLinks = [
		{ label: m.messages_title(), path: '/messages' },
		{ label: m.messages_create_button(), path: '/messages/new' },
		{ label: m.messages_integrations_button(), path: '/integrations/connect' }
	];
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex md:hidden">
		<div class="flex-1 bg-slate-900/40" onclick={onClose}></div>
		<aside class="flex w-72 flex-col bg-white p-6 shadow-2xl">
			<div class="mb-6 flex items-center justify-between">
				<div class="flex-1">
					<p class="text-lg font-semibold text-slate-900">{m.app_title()}</p>
					{#if displayName}
						<p class="text-sm text-slate-500">{displayName}</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
					onclick={onClose}
					aria-label={m.nav_menu_close()}
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>

			<nav class="flex flex-col gap-3">
				{#each navLinks as link (link.path)}
					<button
						type="button"
						class="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:border-red-200 hover:text-red-600"
						onclick={() => onNavigate(link.path)}
					>
						{link.label}
					</button>
				{/each}
			</nav>

			<button
				type="button"
				class="mt-auto rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 hover:border-red-200 hover:text-red-600"
				onclick={onLogout}
			>
				{m.messages_logout_button()}
			</button>
		</aside>
	</div>
{/if}
