import { auth } from '$lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

// Reactive auth state — components read `authState.user`
// Svelte 5 rune-based store pattern
function createAuthState() {
	let user = $state<User | null>(null);
	let ready = $state(false);

	onAuthStateChanged(auth, (firebaseUser) => {
		user = firebaseUser;
		ready = true;
	});

	return {
		get user() { return user; },
		get ready() { return ready; }
	};
}

export const authState = createAuthState();