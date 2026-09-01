const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static(__dirname));


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


        res.json({
            success: true,
            data: response.data
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

    res.json({
        ResultCode: 0,
        ResultDesc: "Accepted"
    });

});


// ================================
// SERVER
// ================================

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Something Fishy running on port ${PORT}`
    );

});
