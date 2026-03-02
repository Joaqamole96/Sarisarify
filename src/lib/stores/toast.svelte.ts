// Simple toast store — fire-and-forget notifications.
// Usage: toast.show('Product added') or toast.show('Sale confirmed', 'success')

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

function createToastStore() {
	let toasts = $state<Toast[]>([]);
	let nextId  = 0;

	return {
		get toasts() { return toasts; },

		show(message: string, type: ToastType = 'success', durationMs = 2500): void {
			const id = nextId++;
			toasts = [...toasts, { id, message, type }];
			setTimeout(() => {
				toasts = toasts.filter((t) => t.id !== id);
			}, durationMs);
		}
	};
}

export const toast = createToastStore();
