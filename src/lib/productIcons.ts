import type { ComponentType } from 'svelte';

import Package from 'lucide-svelte/icons/package';
import ShoppingBasket from 'lucide-svelte/icons/shopping-basket';
import Cigarette from 'lucide-svelte/icons/cigarette';
import Candy from 'lucide-svelte/icons/candy';
import CupSoda from 'lucide-svelte/icons/cup-soda';
import Beer from 'lucide-svelte/icons/beer';
import Wine from 'lucide-svelte/icons/wine';
import Egg from 'lucide-svelte/icons/egg';
import Droplets from 'lucide-svelte/icons/droplets';
import Utensils from 'lucide-svelte/icons/utensils';
import Soup from 'lucide-svelte/icons/soup';
import Brush from 'lucide-svelte/icons/brush';
import ShowerHead from 'lucide-svelte/icons/shower-head';
import Toilet from 'lucide-svelte/icons/toilet';
import Archive from 'lucide-svelte/icons/archive';
import Tag from 'lucide-svelte/icons/tag';

export type ProductIconKey =
	| 'package'
	| 'basket'
	| 'cigarette'
	| 'candy'
	| 'drink'
	| 'beer'
	| 'wine'
	| 'egg'
	| 'oil'
	| 'utensils'
	| 'noodles'
	| 'cleaning'
	| 'toiletries'
	| 'tissue'
	| 'canned'
	| 'load';

export type ProductIconOption = {
	key: ProductIconKey;
	label: string;
	Icon: ComponentType;
};

export type ProductIconGroupKey =
	| 'all'
	| 'smokes'
	| 'snacks'
	| 'drinks'
	| 'instant_drinks'
	| 'alcohol'
	| 'food'
	| 'toiletries'
	| 'load'
	| 'other';

export const PRODUCT_ICON_OPTIONS: readonly ProductIconOption[] = [
	{ key: 'package',    label: 'General',      Icon: Package },
	{ key: 'basket',     label: 'Food/Rice',    Icon: ShoppingBasket },
	{ key: 'cigarette',  label: 'Smokes',       Icon: Cigarette },
	{ key: 'candy',      label: 'Snacks',       Icon: Candy },
	{ key: 'drink',      label: 'Drinks',       Icon: CupSoda },
	{ key: 'beer',       label: 'Beer',         Icon: Beer },
	{ key: 'wine',       label: 'Alcohol',      Icon: Wine },
	{ key: 'egg',        label: 'Eggs',         Icon: Egg },
	{ key: 'oil',        label: 'Oil/Liquids',  Icon: Droplets },
	{ key: 'utensils',   label: 'Food/Ulam',    Icon: Utensils },
	{ key: 'noodles',    label: 'Instant',      Icon: Soup },
	{ key: 'cleaning',   label: 'Cleaning',     Icon: Brush },
	{ key: 'toiletries', label: 'Toiletries',   Icon: ShowerHead },
	{ key: 'tissue',     label: 'Tissue/Paper', Icon: Toilet },
	{ key: 'canned',     label: 'Canned/Jars',  Icon: Archive },
	{ key: 'load',       label: 'Load',         Icon: Tag },
] as const;

const ICON_BY_KEY: Record<ProductIconKey, ComponentType> = Object.fromEntries(
	PRODUCT_ICON_OPTIONS.map((o) => [o.key, o.Icon])
) as Record<ProductIconKey, ComponentType>;

export function getProductIconComponent(key: string | undefined): ComponentType | null {
	if (!key) return null;
	return (ICON_BY_KEY as Record<string, ComponentType>)[key] ?? null;
}

const GROUPS: Record<ProductIconGroupKey, readonly ProductIconKey[]> = {
	all: [
		'package', 'basket', 'cigarette', 'candy', 'drink', 'beer', 'wine', 'egg',
		'oil', 'utensils', 'noodles', 'cleaning', 'toiletries', 'tissue', 'canned', 'load'
	],
	smokes: ['cigarette', 'package'],
	snacks: ['candy', 'package'],
	drinks: ['drink', 'package'],
	instant_drinks: ['drink', 'package'],
	alcohol: ['beer', 'wine', 'package'],
	food: ['basket', 'utensils', 'egg', 'noodles', 'canned', 'package'],
	toiletries: ['toiletries', 'tissue', 'cleaning', 'package'],
	load: ['load', 'package'],
	other: ['package']
};

export function iconKeysForCategory(categoryName: string | undefined): ProductIconKey[] {
	const c = String(categoryName || '').trim().toLowerCase();
	if (!c) return [...GROUPS.other];
	if (c.includes('smoke') || c.includes('cig')) return [...GROUPS.smokes];
	if (c.includes('snack')) return [...GROUPS.snacks];
	if (c.includes('drink') && c.includes('instant')) return [...GROUPS.instant_drinks];
	if (c.includes('drink')) return [...GROUPS.drinks];
	if (c.includes('alcohol') || c.includes('beer') || c.includes('wine')) return [...GROUPS.alcohol];
	if (c.includes('food') || c.includes('rice') || c.includes('ulam') || c.includes('egg') || c.includes('noodle')) return [...GROUPS.food];
	if (c.includes('toilet') || c.includes('toile') || c.includes('tissue') || c.includes('clean')) return [...GROUPS.toiletries];
	if (c.includes('load')) return [...GROUPS.load];
	return [...GROUPS.other];
}

