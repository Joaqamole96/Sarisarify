<script lang="ts">
	import '../app.css';
	import { authState } from '$lib/firebase/auth.svelte';
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { registerSW } from 'virtual:pwa-register';
	import { onMount } from 'svelte';

	onMount(() => {
		registerSW({ immediate: true });
	});

	let { children } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function signIn() {
		error = '';
		loading = true;
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch {
			error = 'Incorrect email or password.';
		} finally {
			loading = false;
		}
	}
</script>

{#if !authState.ready}
	<!-- Splash: waiting for Firebase to restore session -->
	<div class="flex h-screen items-center justify-center bg-green-50">
		<p class="text-green-700 text-lg font-medium">Loading…</p>
	</div>

{:else if !authState.user}
	<!-- Sign-in screen — operators see this once per device -->
	<div class="flex h-screen flex-col items-center justify-center gap-6 bg-green-50 px-8">
		<h1 class="text-3xl font-bold text-green-800">Sarisarify</h1>
		<div class="w-full max-w-sm flex flex-col gap-3">
			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				class="rounded-xl border border-green-200 px-4 py-3 text-base outline-none focus:border-green-500"
			/>
			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				class="rounded-xl border border-green-200 px-4 py-3 text-base outline-none focus:border-green-500"
			/>
			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}
			<button
				onclick={signIn}
				disabled={loading}
				class="rounded-xl bg-green-600 py-3 text-base font-semibold text-white active:bg-green-700 disabled:opacity-50"
			>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</div>
	</div>

{:else}
	<!-- App shell — authenticated -->
	{@render children()}
{/if}