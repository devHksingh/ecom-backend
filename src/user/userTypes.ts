export interface User {
    _id: string,
    name: string,
    email: string,
    password: string,
    refreshToken: string,
    isLogin: boolean,
    role: string,
    phoneNumber: string,
    cardNumber: string,
    address: string,
    purchasedIteams: []
}