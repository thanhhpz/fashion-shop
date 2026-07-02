export class AuthResponseDto {
    access_token!: string;
    user!: {
        id: number;
        ho_ten: string;
        email: string;
        vai_tro: string;
    }
}