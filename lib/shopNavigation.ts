import type { Product } from '@/lib/products';

export interface ShopSubsection {
  id: string;
  label: string;
}

export interface ShopCategory {
  id: string;
  label: string;
  description: string;
  productCategories: string[];
  subsections: ShopSubsection[];
  enabled: boolean;
}

export interface ShopNavigation {
  shopTitle: string;
  shopSubtitle: string;
  merchTitle: string;
  merchSubtitle: string;
  categories: ShopCategory[];
}

export const MERCH_SHOP_ID = 'merch';

export const DEFAULT_SHOP_NAVIGATION: ShopNavigation = {
  shopTitle: 'Shop Our Collection',
  shopSubtitle: 'Authentic products. Lab-tested with COAs. Discreet shipping nationwide.',
  merchTitle: 'All Studio Merch',
  merchSubtitle: 'Official Kush World Studio apparel and accessories. Free shipping on orders $100+.',
  categories: [
    {
      id: 'vaporizers',
      label: 'Vaporizers',
      description: 'Premium hemp vaporizers and disposables with third-party lab COAs. 21+ only.',
      productCategories: ['vapes'],
      subsections: [
        { id: 'disposables', label: 'Disposables' },
        { id: 'cartridges', label: 'Cartridges' },
      ],
      enabled: true,
    },
    {
      id: 'concentrates',
      label: 'Concentrates',
      description: 'High-quality hemp concentrates with full COA documentation. 21+ only.',
      productCategories: ['concentrates'],
      subsections: [
        { id: 'crumble', label: 'Crumble' },
        { id: 'badder', label: 'Badder' },
        { id: 'sugar', label: 'Sugar' },
      ],
      enabled: true,
    },
    {
      id: 'flower',
      label: 'Flower',
      description: 'Premium hemp flower in every style — indoor, smalls, exotic, and more. Lab-tested with COAs. 21+ only.',
      productCategories: ['flower'],
      subsections: [],
      enabled: true,
    },
    {
      id: 'moonrocks',
      label: 'Moonrocks',
      description: 'Premium hemp moonrocks — flower coated in concentrate and kief. Lab-tested with COAs. 21+ only.',
      productCategories: ['moonrocks'],
      subsections: [],
      enabled: true,
    },
    {
      id: 'edibles',
      label: 'Edibles',
      description: 'Lab-tested hemp edibles. Verified potency and discreet shipping. 21+ only.',
      productCategories: ['edibles'],
      subsections: [],
      enabled: true,
    },
    {
      id: 'pre-rolls',
      label: 'Pre Rolls',
      description: 'Premium hemp pre-rolls with COAs available. 21+ only.',
      productCategories: ['pre-rolls'],
      subsections: [],
      enabled: true,
    },
    {
      id: 'accessories',
      label: 'Accessories',
      description: 'Smoking and hemp accessories from Kush World. 21+ only.',
      productCategories: ['accessories'],
      subsections: [],
      enabled: true,
    },
    {
      id: 'mushrooms',
      label: 'Mushrooms',
      description: 'Lab-verified mushroom products. Adults 21+ only.',
      productCategories: ['mushrooms'],
      subsections: [],
      enabled: true,
    },
  ],
};

const CATEGORY_ALIASES: Record<string, string> = {
  vapes: 'vaporizers',
};

export function normalizeShopCategoryId(id: string): string {
  return CATEGORY_ALIASES[id] ?? id;
}

export function mergeShopNavigation(partial?: Partial<ShopNavigation>): ShopNavigation {
  if (!partial) return { ...DEFAULT_SHOP_NAVIGATION, categories: [...DEFAULT_SHOP_NAVIGATION.categories] };

  const categories = [...(partial.categories ?? DEFAULT_SHOP_NAVIGATION.categories)];
  for (const defaults of DEFAULT_SHOP_NAVIGATION.categories) {
    if (!categories.some((category) => category.id === defaults.id)) {
      categories.push({ ...defaults });
    }
  }

  const flowerDefaults = DEFAULT_SHOP_NAVIGATION.categories.find((category) => category.id === 'flower');
  const normalizedCategories = flowerDefaults
    ? categories.map((category) => {
        if (category.id !== 'flower') return category;
        if (category.label === 'Exotic Flower') {
          return {
            ...category,
            label: flowerDefaults.label,
            description: flowerDefaults.description,
          };
        }
        return category;
      })
    : categories;

  return {
    ...DEFAULT_SHOP_NAVIGATION,
    ...partial,
    categories: normalizedCategories,
  };
}

export function getEnabledShopCategories(nav: ShopNavigation): ShopCategory[] {
  return nav.categories.filter((category) => category.enabled);
}

export function getShopCategoryById(nav: ShopNavigation, id: string): ShopCategory | undefined {
  const normalized = normalizeShopCategoryId(id);
  return nav.categories.find((category) => category.id === normalized);
}

export function isMerchShopCategory(id: string): boolean {
  return id === MERCH_SHOP_ID;
}

export function productMatchesShopCategory(product: Product, category: ShopCategory): boolean {
  return category.productCategories.includes(product.category);
}

export function filterProductsByShopCategory(
  products: Product[],
  nav: ShopNavigation,
  categoryId: string,
  subsectionId?: string
): Product[] {
  if (isMerchShopCategory(categoryId)) {
    return products.filter((product) => product.category === 'merch');
  }

  const category = getShopCategoryById(nav, categoryId);
  if (!category) return [];

  let result = products.filter((product) => productMatchesShopCategory(product, category));

  if (subsectionId) {
    result = result.filter((product) => product.subcategory === subsectionId);
  }

  return result;
}

export function getAllProductCategorySlugs(nav: ShopNavigation): string[] {
  const slugs = new Set<string>(['merch']);
  for (const category of nav.categories) {
    for (const slug of category.productCategories) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs);
}

export function slugifyShopSubsectionId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getShopCategoryForProductCategory(
  nav: ShopNavigation,
  productCategory: string
): ShopCategory | undefined {
  return nav.categories.find((category) => category.productCategories.includes(productCategory));
}

export function getSubsectionsForProductCategory(
  nav: ShopNavigation,
  productCategory: string
): ShopSubsection[] {
  return getShopCategoryForProductCategory(nav, productCategory)?.subsections ?? [];
}

export function getSubsectionLabel(
  nav: ShopNavigation,
  productCategory: string,
  subsectionId?: string
): string {
  if (!subsectionId) return '';
  const subsection = getSubsectionsForProductCategory(nav, productCategory).find(
    (item) => item.id === subsectionId
  );
  return subsection?.label ?? subsectionId;
}

export function addSubsectionForProductCategory(
  nav: ShopNavigation,
  productCategory: string,
  label: string
): { navigation: ShopNavigation; subsection: ShopSubsection; created: boolean } | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const categoryIndex = nav.categories.findIndex((category) =>
    category.productCategories.includes(productCategory)
  );
  if (categoryIndex === -1) return null;

  const category = nav.categories[categoryIndex];
  const id = slugifyShopSubsectionId(trimmed);
  const existing = category.subsections.find((subsection) => subsection.id === id);
  if (existing) {
    return { navigation: nav, subsection: existing, created: false };
  }

  const subsection = { id, label: trimmed };
  const categories = nav.categories.map((item, index) =>
    index === categoryIndex
      ? { ...item, subsections: [...item.subsections, subsection] }
      : item
  );

  return {
    navigation: { ...nav, categories },
    subsection,
    created: true,
  };
}

export function getProductCategoryLabel(nav: ShopNavigation, productCategory: string): string {
  if (productCategory === 'merch') return 'Studio Merch';
  const shopCategory = nav.categories.find((category) =>
    category.productCategories.includes(productCategory)
  );
  return shopCategory?.label ?? productCategory;
}

export const ADMIN_PRODUCT_CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'merch', label: 'Merch' },
  { id: 'vaporizers', label: 'Vaporizers' },
  { id: 'concentrates', label: 'Concentrates' },
  { id: 'flower', label: 'Flower' },
  { id: 'moonrocks', label: 'Moonrocks' },
  { id: 'edibles', label: 'Edibles' },
  { id: 'pre-rolls', label: 'Pre Rolls' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'mushrooms', label: 'Mushrooms' },
] as const;

export type AdminProductCategoryTabId = (typeof ADMIN_PRODUCT_CATEGORY_TABS)[number]['id'];

export function productMatchesAdminCategoryTab(
  product: Pick<Product, 'category'>,
  tabId: AdminProductCategoryTabId
): boolean {
  if (tabId === 'all') return true;
  if (tabId === 'merch') return product.category === 'merch';
  if (tabId === 'vaporizers') return product.category === 'vapes';
  return product.category === tabId;
}

export function getShopCategoryLabel(nav: ShopNavigation, categoryId: string): string {
  if (isMerchShopCategory(categoryId)) return 'Studio Merch';
  return getShopCategoryById(nav, categoryId)?.label ?? categoryId;
}

export function getShopCategoryDescription(nav: ShopNavigation, categoryId: string): string {
  if (isMerchShopCategory(categoryId)) return nav.merchSubtitle;
  return getShopCategoryById(nav, categoryId)?.description ?? nav.shopSubtitle;
}

export function getShopPageHeading(nav: ShopNavigation, categoryId?: string, merchOnly = false): string {
  if (merchOnly || isMerchShopCategory(categoryId ?? '')) return nav.merchTitle;
  if (categoryId && categoryId !== 'all') {
    return getShopCategoryById(nav, categoryId)?.label ?? nav.shopTitle;
  }
  return nav.shopTitle;
}

export function getShopPathForProduct(nav: ShopNavigation, product: Pick<Product, 'category'>): string {
  if (product.category === 'merch') return `/shop/${MERCH_SHOP_ID}`;
  const category = nav.categories.find((item) => item.productCategories.includes(product.category));
  return category ? `/shop/${category.id}` : '/shop';
}

export function getShopPageSubheading(
  nav: ShopNavigation,
  categoryId?: string,
  merchOnly = false
): string {
  if (merchOnly || isMerchShopCategory(categoryId ?? '')) return nav.merchSubtitle;
  if (categoryId && categoryId !== 'all') {
    return getShopCategoryDescription(nav, categoryId);
  }
  return nav.shopSubtitle;
}