// ================================
// SOMETHING FISHY - CHECKOUT
// ================================

const savedCart =
    JSON.parse(localStorage.getItem("somethingFishyCart")) || [];

const savedTotal =
    Number(localStorage.getItem("somethingFishyTotal")) || 0;

const checkoutItems =
    document.getElementById("checkoutItems");

const checkoutTotal =
    document.getElementById("checkoutTotal");

checkoutItems.innerHTML = "";

if (savedCart.length === 0) {

    checkoutItems.innerHTML =
        `<p>Your cart is empty 🛒</p>`;

} else {

    savedCart.forEach(item => {

        const div =
            document.createElement("div");

        div.className =
            "checkout-item";

        div.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <br>
                KSh ${Number(item.price).toLocaleString()}
            </div>
        `;

        checkoutItems.appendChild(div);
    });
}

checkoutTotal.textContent =
    "KSh " + savedTotal.toLocaleString();

const checkoutForm =
    document.getElementById("checkoutForm");

checkoutForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const customerName =
            document
                .getElementById("customerName")
                .value
                .trim();

        const customerPhone =
            document
                .getElementById("customerPhone")
                .value
                .trim();

        const customerLocation =
            document
                .getElementById("customerLocation")
                .value
                .trim();


        // ================================
        // VALIDATION
        // ================================

        if (!customerName) {

            alert("Please enter your full name.");
            return;
        }

        if (!customerPhone) {

            alert("Please enter your phone number.");
            return;
        }

        if (!customerLocation) {

            alert("Please enter your delivery location.");
            return;
        }

        if (savedCart.length === 0) {

            alert("Your cart is empty 🛒");
            return;
        }

        if (savedTotal <= 0) {

            alert("Invalid order total.");
            return;
        }


        // ================================
        // FORMAT PHONE NUMBER
        // ================================

        let mpesaPhone =
            customerPhone.replace(/\s+/g, "");

        if (mpesaPhone.startsWith("0")) {

            mpesaPhone =
                "254" +
                mpesaPhone.substring(1);
        }

        if (mpesaPhone.startsWith("+254")) {

            mpesaPhone =
                mpesaPhone.substring(1);
        }

        if (!/^2547\d{8}$/.test(mpesaPhone)) {

            alert(
                "Please enter a valid Kenyan phone number.\n\n" +
                "Example: 0712345678"
            );

            return;
        }


        // ================================
        // CREATE ORDER ID
        // ================================

        const orderId =
            "SF-" + Date.now();

        const orderData = {
    orderId: orderId,
    customerName: customerName,
    phone: mpesaPhone,
    location: customerLocation,
    items: savedCart,
    amount: savedTotal
};

        const paymentButton =
            checkoutForm.querySelector(".pay-btn");


        paymentButton.disabled = true;

        paymentButton.textContent =
            "⏳ Sending Payment Request...";


        // ================================
        // START PAYMENT
        // ================================

// Save order on the server
const orderResponse = await fetch("/api/orders", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(orderData)
});

const orderResult = await orderResponse.json();

if (!orderResult.success) {
    alert("Could not save your order. Please try again.");
    paymentButton.disabled = false;
    paymentButton.textContent = "💳 Pay to Order";
    return;
}
        
        try {

            const response =
                await fetch(
                    "/api/mpesa/stkpush",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            phone: mpesaPhone,
                            amount: savedTotal,
                            orderId: orderId
                        })
                    }
                );


            const result =
                await response.json();


            console.log(
                "M-Pesa Response:",
                result
            );


            // ================================
            // PAYMENT REQUEST SENT
            // ================================

            if (result.success) {

                localStorage.setItem(
                    "somethingFishyCustomer",
                    JSON.stringify({
                        name: customerName,
                        phone: mpesaPhone,
                        location: customerLocation,
                        orderId: orderId,
                        amount: savedTotal
                    })
                );


                paymentButton.textContent =
                    "⏳ Waiting for Payment...";


                alert(
                    "Payment request sent successfully! 📱\n\n" +
                    "Check your phone and enter your M-Pesa PIN.\n\n" +
                    "The website will automatically confirm your payment."
                );


                // ================================
                // WAIT FOR PAYMENT CONFIRMATION
                // ================================

                let paymentConfirmed =
                    false;


                for (
                    let attempt = 0;
                    attempt < 45;
                    attempt++
                ) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                2000
                            )
                    );


                    try {

                        const statusResponse =
                            await fetch(
                                `/api/mpesa/status/${encodeURIComponent(orderId)}`
                            );


                        const status =
                            await statusResponse.json();


                        console.log(
                            "Payment Status:",
                            status
                        );


                        // ================================
                        // PAYMENT SUCCESS
                        // ================================

                        if (
                            status.status ===
                            "success"
                        ) {

                            paymentConfirmed =
                                true;


                            localStorage.setItem(
                                "somethingFishyLastOrder",
                                JSON.stringify({
                                    name:
                                        customerName,

                                    phone:
                                        mpesaPhone,

                                    location:
                                        customerLocation,

                                    orderId:
                                        orderId,

                                    amount:
                                        savedTotal,

                                    receipt:
                                        status.receipt
                                })
                            );


                            // Clear cart
                            localStorage.removeItem(
                                "somethingFishyCart"
                            );

                            localStorage.removeItem(
                                "somethingFishyTotal"
                            );


                            paymentButton.textContent =
                                "✅ Order Confirmed";


                            alert(
                                "🎉 PAYMENT SUCCESSFUL!\n\n" +
                                "M-Pesa Receipt: " +
                                status.receipt +
                                "\n\n" +
                                "Your Something Fishy order has been confirmed! 🐟"
                            );


                           const whatsappNumber = "254745706464";

const orderMessage =
    "🐟 SOMETHING FISHY - PAID ORDER\n\n" +
    "Customer: " + customerName + "\n" +
    "Phone: " + mpesaPhone + "\n" +
    "Location: " + customerLocation + "\n\n" +
    "ORDER ITEMS:\n" +
    savedCart.map(item =>
        "• " +
        item.name +
        " — KSh " +
        Number(item.price).toLocaleString()
    ).join("\n") +
    "\n\n" +
    "TOTAL: KSh " +
    savedTotal.toLocaleString() +
    "\n" +
    "M-PESA RECEIPT: " +
    status.receipt +
    "\n\n" +
    "✅ PAYMENT CONFIRMED";

const whatsappURL =
    "https://wa.me/" +
    whatsappNumber +
    "?text=" +
    encodeURIComponent(orderMessage);

window.location.href = whatsappURL;


                            break;
                        }


                        // ================================
                        // PAYMENT FAILED
                        // ================================

                        if (
                            status.status ===
                            "failed"
                        ) {

                            paymentConfirmed =
                                true;


                            alert(
                                "❌ Payment was not completed.\n\n" +
                                (
                                    status.message ||
                                    "Please try again."
                                )
                            );


                            paymentButton.disabled =
                                false;

                            paymentButton.textContent =
                                "💳 Pay to Order";


                            break;
                        }

                    } catch (statusError) {

                        console.error(
                            "Payment status error:",
                            statusError
                        );
                    }
                }


                // ================================
                // PAYMENT NOT CONFIRMED
                // ================================

                if (!paymentConfirmed) {

                    alert(
                        "⏳ We could not confirm your payment yet.\n\n" +
                        "Please check your M-Pesa messages before trying again."
                    );


                    paymentButton.disabled =
                        false;

                    paymentButton.textContent =
                        "💳 Pay to Order";
                }


            } else {

                // ================================
                // PAYMENT REQUEST FAILED
                // ================================

                alert(
                    result.message ||
                    "Unable to start M-Pesa payment."
                );


                paymentButton.disabled =
                    false;


                paymentButton.textContent =
                    "💳 Pay to Order";
            }


        } catch (error) {

            console.error(
                "Payment Error:",
                error
            );


            alert(
                "Could not connect to the payment server.\n\n" +
                "Please make sure your Node.js server is running."
            );


            paymentButton.disabled =
                false;


            paymentButton.textContent =
                "💳 Pay to Order";
        }

    }
);
