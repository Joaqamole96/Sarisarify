function createThemeStore() {
	let dark = $state(false);

	if (typeof window !== 'undefined') {
		dark = localStorage.getItem('theme') === 'dark';
		document.documentElement.classList.toggle('dark', dark);
	}

	return {
		get dark() { return dark; },

		toggle() {
			dark = !dark;
			if (typeof window !== 'undefined') {
				localStorage.setItem('theme', dark ? 'dark' : 'light');
				document.documentElement.classList.toggle('dark', dark);
			}
		}
	};
}

export const theme = createThemeStore();