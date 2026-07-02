export class SubCategoryDto{
    id!: number;
    ten_danh_muc!: string;
    slug!: string | null;
}

export class CategoryResponseDto{
    id!: number;
    ten_danh_muc!: string;
    slug!: string | null;
    mo_ta!: string | null;
    subCategories!: SubCategoryDto[];
}