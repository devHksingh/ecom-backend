export interface Users {
    _id: string,
    name: string,
    email: string,
    password: string,
    refreshToken?: string,
    isLogin: boolean,
    role: string,
    phoneNumber?: string,
    cardNumber?: string,
    address?: string,
    pinCode:string,
    purchasedIteams?: [],
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
    createdAt:string
}