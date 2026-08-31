let cart = [];


// ADD TO CART

function addToCart(name, price) {

    cart.push({
        name: name,
        price: price
    });

    updateCart();

    alert(name + " added to cart 🐟");
}


// UPDATE CART

function updateCart() {

    const cartCount = document.getElementById("cartCount");

    const cartItems = document.getElementById("cartItems");

    const cartTotal = document.getElementById("cartTotal");

    cartCount.textContent = cart.length;

    cartItems.innerHTML = "";

    let total = 0;


    cart.forEach((item, index) => {

        total += item.price;

        const div = document.createElement("div");

        div.className = "cart-item";

        div.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <br>
                KSh ${item.price}
            </div>

            <button
                class="remove-btn"
                onclick="removeFromCart(${index})">
                Remove
            </button>
        `;

        cartItems.appendChild(div);

    });


    cartTotal.textContent = "KSh " + total;
}


// REMOVE ITEM

function removeFromCart(index) {

    cart.splice(index, 1);

    updateCart();
}


// OPEN CART

function openCart() {

    document.getElementById("cartModal").style.display = "flex";

    updateCart();
}


// CLOSE CART

function closeCart() {

    document.getElementById("cartModal").style.display = "none";
}

// PAY TO ORDER

function payToOrder() {

    if (cart.length === 0) {
        alert("Your cart is empty 🛒");
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price;
    });

    localStorage.setItem(
        "somethingFishyCart",
        JSON.stringify(cart)
    );

    localStorage.setItem(
        "somethingFishyTotal",
        total
    );

    window.location.href = "checkout.html";
}
