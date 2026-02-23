/**
 * Bundled icon registry using @expo/vector-icons MaterialCommunityIcons.
 *
 * Each entry maps a human-readable key (iconId stored in Product.iconId)
 * to the exact MaterialCommunityIcons icon name.
 *
 * To add more icons: browse https://pictogrammers.com/library/mdi/
 */

export interface IconEntry {
  id: string;
  label: string;
  /** MaterialCommunityIcons icon name */
  icon: string;
}

export const PRODUCT_ICONS: IconEntry[] = [
  // Beverages
  { id: 'softdrink',      label: 'Soft Drink',        icon: 'bottle-soda'          },
  { id: 'water',          label: 'Water',              icon: 'water'                },
  { id: 'juice',          label: 'Juice',              icon: 'cup'                  },
  { id: 'coffee',         label: 'Coffee',             icon: 'coffee'               },
  { id: 'beer',           label: 'Beer',               icon: 'beer'                 },
  { id: 'liquor',         label: 'Liquor',             icon: 'bottle-wine'          },
  // Food
  { id: 'rice',           label: 'Rice',               icon: 'rice'                 },
  { id: 'bread',          label: 'Bread/Pandesal',     icon: 'bread-slice'          },
  { id: 'noodles',        label: 'Noodles',            icon: 'noodles'              },
  { id: 'egg',            label: 'Egg',                icon: 'egg'                  },
  { id: 'fish',           label: 'Fish',               icon: 'fish'                 },
  { id: 'meat',           label: 'Meat',               icon: 'food-steak'           },
  { id: 'canned',         label: 'Canned Goods',       icon: 'food-variant'         },
  { id: 'snack',          label: 'Snack/Chips',        icon: 'food'                 },
  { id: 'candy',          label: 'Candy/Sweets',       icon: 'candy'                },
  { id: 'ice_cream',      label: 'Ice Cream',          icon: 'ice-cream'            },
  // Condiments & Cooking
  { id: 'condiment',      label: 'Condiment/Sauce',    icon: 'bottle-tonic'         },
  { id: 'oil',            label: 'Cooking Oil',        icon: 'oil'                  },
  { id: 'salt_sugar',     label: 'Salt / Sugar',       icon: 'shaker-outline'       },
  // Tobacco
  { id: 'cigarette',      label: 'Cigarette',          icon: 'smoking'              },
  // Hygiene & Household
  { id: 'soap',           label: 'Soap',               icon: 'soap'                 },
  { id: 'shampoo',        label: 'Shampoo',            icon: 'bottle-tonic-skull'   },
  { id: 'toothpaste',     label: 'Toothpaste',         icon: 'tooth-outline'        },
  { id: 'detergent',      label: 'Detergent',          icon: 'washing-machine'      },
  { id: 'tissue',         label: 'Tissue/Paper',       icon: 'paper-roll-outline'   },
  { id: 'match',          label: 'Matches/Lighter',    icon: 'fire'                 },
  // Load / E-load
  { id: 'eload',          label: 'E-Load',             icon: 'cellphone-wireless'   },
  // Generic fallback
  { id: 'generic',        label: 'Other',              icon: 'package-variant'      },
];

/** Quick lookup by iconId */
export const ICON_MAP = Object.fromEntries(
  PRODUCT_ICONS.map((e) => [e.id, e])
) as Record<string, IconEntry>;

export function getIcon(iconId: string): IconEntry {
  return ICON_MAP[iconId] ?? ICON_MAP['generic'];
}
