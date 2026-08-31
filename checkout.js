// ================================
// SOMETHING FISHY - CHECKOUT
// ================================


// LOAD CART FROM LOCAL STORAGE
const savedCart =
    JSON.parse(localStorage.getItem("somethingFishyCart")) || [];


// LOAD TOTAL FROM LOCAL STORAGE
const savedTotal =
    Number(localStorage.getItem("somethingFishyTotal")) || 0;


// GET HTML ELEMENTS
const checkoutItems =
    document.getElementById("checkoutItems");

const checkoutTotal =
    document.getElementById("checkoutTotal");


// ================================
// DISPLAY ORDER ITEMS
// ================================

checkoutItems.innerHTML = "";


if (savedCart.length === 0) {

    checkoutItems.innerHTML = `
        <p>Your cart is empty 🛒</p>
    `;

} else {

    savedCart.forEach(item => {

        const div =
            document.createElement("div");

        div.className = "checkout-item";

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


// ================================
// DISPLAY TOTAL
// ================================

checkoutTotal.textContent =
    "KSh " + savedTotal.toLocaleString();


// ================================
// CHECKOUT FORM
// ================================

const checkoutForm =
    document.getElementById("checkoutForm");


checkoutForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        // ================================
        // GET CUSTOMER DETAILS
        // ================================

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
        // VALIDATE DETAILS
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


        // ================================
        // CHECK CART
        // ================================

        if (savedCart.length === 0) {

            alert("Your cart is empty 🛒");

            return;
        }


        if (savedTotal <= 0) {

            alert("Invalid order total.");

            return;
        }


        // ================================
        // CONVERT PHONE NUMBER
        // ================================

        let mpesaPhone =
            customerPhone.replace(/\s+/g, "");


        // 07XXXXXXXX → 2547XXXXXXXX

        if (mpesaPhone.startsWith("0")) {

            mpesaPhone =
                "254" +
                mpesaPhone.substring(1);

        }


        // +2547XXXXXXXX → 2547XXXXXXXX

        if (mpesaPhone.startsWith("+254")) {

            mpesaPhone =
                mpesaPhone.substring(1);

        }


        // ================================
        // VALIDATE KENYAN NUMBER
        // ================================

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


        // ================================
        // GET PAYMENT BUTTON
        // ================================

        const paymentButton =
            checkoutForm.querySelector(".pay-btn");


        paymentButton.disabled = true;

        paymentButton.textContent =
            "⏳ Sending Payment Request...";


        // ================================
        // SEND M-PESA REQUEST
        // ================================

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

                            phone:
                                mpesaPhone,

                            amount:
                                savedTotal,

                            orderId:
                                orderId

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
            // PAYMENT REQUEST SUCCESS
            // ================================

            if (result.success) {

                paymentButton.textContent =
                    "✅ Payment Request Sent";


                alert(
                    "Payment request sent successfully! 📱\n\n" +

                    "Amount: KSh " +
                    savedTotal.toLocaleString() +

                    "\n\n" +

                    "Check your phone and enter your M-Pesa PIN."
                );


                // Save customer information
                // for the order

                localStorage.setItem(
                    "somethingFishyCustomer",
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
                            savedTotal

                    })
                );


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