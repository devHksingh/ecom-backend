export interface Orders {
    orderStatus: string,
    trackingId: string,
    // user: [],
    // product: [],
    orderPlaceOn: Date,
    totalPrice: number,
    quantity: number,
    productDetail:{
        name:string,
        price:number,
        imageUrl:string,
        currency:string
    },
    userDetails:{},
    createdAt:string
}