export interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    parentId?: string;
}

export interface CreateCategoryDto{
    name: string;
    slug: string;
    imageUrl?: string;
    description?: string;
    parentId?: string;
}

export interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    imageUrl?: string;
    description?: string;
    parentId?: string;
}