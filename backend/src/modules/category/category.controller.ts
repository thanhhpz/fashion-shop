import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthGuard } from "@nestjs/passport";
import { Public } from "../../common/decorators/public.decorator";

@Controller('categories')
export class CategoryController{
    constructor(private readonly categoryService: CategoryService){}
    // @UseGuards(AuthGuard('jwt'))
    @Public()
    @Get('slug/:slug')
    async getCategoryBySlug(
        @Param('slug') slug: string,
    ): Promise<{success: boolean; data:CategoryResponseDto}>{
        const data = await this.categoryService.getCategoryBySlug(slug);
        return {success: true, data};
    }
    // @UseGuards(AuthGuard('jwt'))
    @Public()
    @Get(':id')
    async getCategoryById(
        @Param('id', ParseIntPipe) id: number,  // ParseIntPipe tự động chuyển string -> number
    ): Promise<{ success: boolean; data: CategoryResponseDto }> {
        const data = await this.categoryService.getCategoryById(id);
        return { success: true, data };
    }

}