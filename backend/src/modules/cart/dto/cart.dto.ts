// // backend/src/modules/cart/dto/cart.dto.ts
// import { IsInt, IsOptional, Min } from 'class-validator';

// export class AddToCartDto {
//   @IsInt()
//   san_pham_id!: number;

//   @IsInt()
//   bien_the_id!: number;

//   @IsInt()
//   @Min(1)
//   so_luong: number = 1;
// }

// export class UpdateCartDto {
//   @IsInt()
//   @Min(1)
//   so_luong!: number;
// }

// export class CartResponseDto {
//   id!: number;
//   ma_gio_hang!: string;
//   items!: CartItemDto[];
//   tong_tien!: number;
//   tong_so_luong!: number;
// }

// export class CartItemDto {
//   id!: number;
//   bien_the_san_pham_id!: number;
//   ten_san_pham!: string;
//   slug!: string;
//   ten_mau!: string;
//   ma_hex!: string;
//   ten_kich_co!: string;
//   gia_ban!: number;
//   so_luong!: number;
//   thanh_tien!: number;
//   anh_dai_dien!: string | null;
// }