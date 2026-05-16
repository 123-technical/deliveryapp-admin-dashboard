export interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    parentId: string | null;   // null = top-level, string = subcategory
}

export type SubCategoriesMap = Record<string, Category[]>;

export interface CreateCategoryDto {
    name: string;
    slug: string;
    imageUrl?: string;
    description?: string;
    parentId?: string | null;
}

export interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    imageUrl?: string;
    description?: string;
    parentId?: string | null;
}