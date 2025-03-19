import dotenv from "dotenv";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("Missing Paystack credentials");
}

const PAYSTACK_API = "https://api.paystack.co";

async function paystackRequest(endpoint, method = "GET", data = null) {
  const response = await fetch(`${PAYSTACK_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    ...(data && { body: JSON.stringify(data) })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Paystack request failed");
  }

  return result;
}

export async function createCustomer(email, name, phone) {
  console.log("Received fullName:", name); // Debugging

  if (!name) {
    throw new Error("Full name is required but got undefined");
  }
  return paystackRequest("/customer", "POST", {
    email,
    first_name: name.split(" ")[0],
    last_name: name.split(" ").slice(1).join(" "),
    phone
  });
}

export async function createDedicatedAccount(customer_code) {
  return paystackRequest("/dedicated_account", "POST", {
    customer: customer_code,
    preferred_bank: "wema-bank"
  });
}
