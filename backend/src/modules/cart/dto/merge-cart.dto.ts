// src/modules/cart/dto/merge-cart.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class MergeCartDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID không được để trống' })
  session_id!: string;
}