const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGODB_URI);
const db = mongoClient.db("something-fishy");
const ordersCollection = db.collection("orders");

const app = express();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Store M-Pesa payment status
const paymentStatuses = new Map();
const checkoutToOrder = new Map();

// Store customer orders
const orders = new Map();

app.use(express.json());
app.use(express.static(__dirname));
// ================================
// SAVE CUSTOMER ORDER
// ================================

app.post("/api/orders", (req, res) => {

    const order = req.body;

    if (!order.orderId || !order.customerName || !order.phone || !order.items) {
        return res.status(400).json({
            success: false,
            message: "Incomplete order information."
        });
    }

    orders.set(order.orderId, {
        ...order,
        status: "pending",
        createdAt: new Date().toISOString()
    });

    console.log("📦 ORDER SAVED:", order.orderId);

    res.json({
        success: true,
        message: "Order saved successfully."
    });
});

// ================================
// M-PESA ACCESS TOKEN
// ================================

async function getAccessToken() {

    const credentials =
        Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
        ).toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${credentials}`
            }
        }
    );

    return response.data.access_token;
}


// ================================
// START PAYMENT
// ================================

app.post("/api/mpesa/stkpush", async (req, res) => {

    try {

        const {
            phone,
            amount,
            orderId
        } = req.body;
console.log("========== PAYMENT DATA ==========");
console.log("BODY:", req.body);
console.log("PHONE:", phone);
console.log("AMOUNT:", amount);
console.log("ORDER ID:", orderId);
console.log("==================================");

        if (!phone || !amount || !orderId) {

            return res.status(400).json({
                success: false,
                message: "Missing payment information."
            });

        }


        const token =
            await getAccessToken();
        const now = new Date();

 const timestamp = 
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
 
        const password =
            Buffer.from(
                `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
            ).toString("base64");

console.log("SHORTCODE:", process.env.MPESA_SHORTCODE);
console.log("PHONE:", phone);
console.log("AMOUNT:", amount);
console.log("TIMESTAMP:", timestamp);
        const response =
            await axios.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",

                {
                    BusinessShortCode:
                        process.env.MPESA_SHORTCODE,

                    Password:
                        password,

                    Timestamp:
                        timestamp,

                    TransactionType:
                        "CustomerPayBillOnline",

                    Amount:
                        Math.round(amount),

                    PartyA:
                        phone,

                    PartyB:
                        process.env.MPESA_SHORTCODE,

                    PhoneNumber:
                        phone,

                    CallBackURL:
                        process.env.CALLBACK_URL,

                    AccountReference:
                        orderId,

                    TransactionDesc:
                        "Something Fishy Order"
                },

                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        const checkoutRequestId = response.data.CheckoutRequestID;

paymentStatuses.set(orderId, {
    status: "pending",
    checkoutRequestId: checkoutRequestId,
    merchantRequestId: response.data.MerchantRequestID
});

checkoutToOrder.set(checkoutRequestId, orderId);

res.json({
    success: true,
    data: response.data,
    orderId: orderId
});


       } catch (error) {

        console.log("========== M-PESA ERROR ==========");

        console.log("Status:", error.response?.status);

        console.log(
            "Safaricom response:",
            JSON.stringify(error.response?.data, null, 2)
        );

        console.log("Error:", error.message);

        console.log("===================================");

        res.status(500).json({
            success: false,
            message: "Unable to start M-Pesa payment.",
            error: error.response?.data || error.message
        });

    }

});   // 👈 THIS ONE IS IMPORTANT


// ================================
// M-PESA CALLBACK
// ================================

app.post("/api/mpesa/callback", (req, res) => {
    console.log(
        "M-Pesa Callback:",
        JSON.stringify(req.body, null, 2)
    );

    const callback =
        req.body?.Body?.stkCallback;

    if (!callback) {
        return res.json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });
    }

    const checkoutRequestId =
        callback.CheckoutRequestID;

    const orderId =
        checkoutToOrder.get(checkoutRequestId);

    if (callback.ResultCode === 0) {

        let metadata = {};

        if (callback.CallbackMetadata?.Item) {
            callback.CallbackMetadata.Item.forEach(item => {
                metadata[item.Name] = item.Value;
            });
        }

       if (orderId) {

    paymentStatuses.set(orderId, {
        status: "success",
        checkoutRequestId: checkoutRequestId,
        receipt: metadata.MpesaReceiptNumber,
        amount: metadata.Amount,
        phone: metadata.PhoneNumber,
        transactionDate: metadata.TransactionDate
    });

    // Mark order as PAID
    const order = orders.get(orderId);

    if (order) {
        order.status = "PAID";
        order.mpesaReceipt = metadata.MpesaReceiptNumber;
        order.paidAmount = metadata.Amount;
        order.transactionDate = metadata.TransactionDate;

        orders.set(orderId, order);

        console.log("✅ ORDER MARKED AS PAID:", orderId);
    }
}

        console.log("✅ PAYMENT SUCCESSFUL");
        console.log("ORDER ID:", orderId);
        console.log("RECEIPT:", metadata.MpesaReceiptNumber);

    } else {

        if (orderId) {
            paymentStatuses.set(orderId, {
                status: "failed",
                checkoutRequestId: checkoutRequestId,
                message: callback.ResultDesc
            });
        }

        console.log("❌ PAYMENT FAILED");
        console.log("ORDER ID:", orderId);
        console.log("REASON:", callback.ResultDesc);
    }

    res.json({
        ResultCode: 0,
        ResultDesc: "Accepted"
    });
});

// ================================
// GET ALL ORDERS
// ================================

app.get("/api/orders", (req, res) => {

    const password = req.headers["x-admin-password"];

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const allOrders = Array.from(orders.values());

    res.json({
        success: true,
        orders: allOrders
    });

});

// ================================
// SERVER
// ================================

// Check payment status
app.get("/api/mpesa/status/:orderId", (req, res) => {
    const orderId = req.params.orderId;

    const payment = paymentStatuses.get(orderId);

    if (!payment) {
        return res.status(404).json({
            success: false,
            status: "not_found"
        });
    }

    res.json({
        success: true,
        ...payment
    });
});
const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Something Fishy running on port ${PORT}`
    );

});
