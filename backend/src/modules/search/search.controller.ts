// src/modules/search/search.controller.ts

import {
  Controller,
  Get,
  Query,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(@Query() query: SearchDto) {
    try {
      this.logger.debug(`Search query: ${JSON.stringify(query)}`);
      const data = await this.searchService.searchProducts(query);
      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tìm kiếm';
      this.logger.error(`Search error: ${errorMessage}`);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Public()
  @Get('suggest')
  async suggest(@Query('keyword') keyword: string) {
    try {
      const data = await this.searchService.getSuggestions(keyword || '');
      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi lấy gợi ý';
      this.logger.error(`Suggest error: ${errorMessage}`);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Public()
  @Get('trending')
  async trending(@Query('limit') limit?: string) {
    try {
      const data = await this.searchService.getTrendingKeywords(
        limit ? parseInt(limit) : 10
      );
      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi lấy từ khóa hot';
      this.logger.error(`Trending error: ${errorMessage}`);
      throw new InternalServerErrorException(errorMessage);
    }
  }
}