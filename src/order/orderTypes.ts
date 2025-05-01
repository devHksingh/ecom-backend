import { Products } from "../product/productTypes"

export interface Orders {
    orderStatus: string,
    trackingId: string,
    // user: [],
    // product: [],
    orderPlaceOn: Date,
    totalPrice: number,
    quantity: number,
    productDetail: {
        productId: string,
        name: string,
        price: number,
        imageUrl: string,
        currency: string
    },
    userDetails: {},
    createdAt: string
}

export interface OrderProductRequest {
    productId: Products,
    quantity: number,
}

export interface InvalidProductsProps {
    product: Products,
    quantity: number,
    reason: string
}

export interface ValidProductsProps{
    product: Products,
    quantity: number,
}