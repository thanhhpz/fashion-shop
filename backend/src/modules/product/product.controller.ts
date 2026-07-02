// backend/src/modules/products/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get('category')
  async getProductsByCategory(
    @Query('categorySlug') categorySlug: string,
    @Query('danhMucCon') danhMucCon?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const data = await this.productService.getProductsByCategory({
      categorySlug,
      danhMucCon,
      sort: sort || 'default',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
    });
    return { success: true, data };
  }

  @Public()
  @Get('featured')
  async getFeaturedProducts(@Query('limit') limit?: string) {
    const data = await this.productService.getFeaturedProducts(
      limit ? parseInt(limit, 10) : 8
    );
    return { success: true, data };
  }

  @Public()
  @Get('slug/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    const data = await this.productService.getProductBySlug(slug);
    return { success: true, data };
  }

  @Public()
  @Get(':id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productService.getProductById(id);
    return { success: true, data };
  }

  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    const data = await this.productService.createProduct(createProductDto);
    return { success: true, data };
  }

  @Put(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const data = await this.productService.updateProduct(id, updateProductDto);
    return { success: true, data };
  }

  @Delete(':id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productService.deleteProduct(id);
    return { success: true, data };
  }
}