import { supabase } from "../config/supabase.js";
import {
  generateOTP,
  storeOTP,
  verifyOTP,
  canResendOTP
} from "../utils/otp.js";
import { sendOTP } from "../services/email.js";
import {
  createCustomer,
  createDedicatedAccount
} from "../services/paystack.js";

export async function login(req, res) {
  try {
    const { email } = req.body;
    console.log("Login attempt for email:", email);

    // Check if user exists
    const { data: user, error } = await supabase
      .from("Users_duplicate")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(
        "[LOGIN] Supabase error while checking user existence:",
        error
      );
      return res
        .status(500)
        .json({ error: "Database error while checking user" });
    }

    if (!user) {
      console.log("User does not exist, creating new user:", email);
      const { data: newUser, error: createError } = await supabase
        .from("Users_duplicate")
        .insert([{ email }])
        .select()
        .single();

      if (createError) {
        console.error("[LOGIN] Error creating new user:", createError);
        return res.status(500).json({ error: "Error creating new user" });
      }

      console.log("New user created successfully:", newUser);
      return res.json({ message: "New user created. Please verify OTP." });
    }

    console.log("User exists, generating OTP for:", email);
    const otp = generateOTP();
    storeOTP(email, otp);
    // await sendOTP(email, otp);

    console.log("OTP sent successfully to:", email);
    res.json({ message: "User exists. OTP sent successfully" });
  } catch (error) {
    console.error("[LOGIN] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function register(req, res) {
  try {
    const { email, bvn, fullName, phoneNumber } = req.body;
    console.log("Registering user:", { email, bvn, fullName, phoneNumber });

    const { data: user, error: updateError } = await supabase
      .from("Users_duplicate")
      .update({ bvn, full_name: fullName, phone_number: phoneNumber })
      .eq("email", email)
      .select()
      .single();

    if (updateError) {
      console.error("[REGISTER] Error updating user details:", updateError);
      throw updateError;
    }

    if (!fullName) {
      console.error("Error: fullName is missing in register()");
      return res.status(400).json({ error: "Full name is required" });
    }

    const customerResponse = await createCustomer(email, fullName, phoneNumber);

    console.log(
      "Creating Paystack DVA for customer:",
      customerResponse.data.customer_code
    );
    const dvaResponse = await createDedicatedAccount(
      customerResponse.data.customer_code
    );

    console.log("Storing DVA details for:", email);
    await supabase
      .from("Users_duplicate")
      .update({
        paystack_customer_code: customerResponse.data.customer_code,
        dva_account_number: dvaResponse.data.account_number,
        dva_bank_name: dvaResponse.data.bank_name
      })
      .eq("email", email);

    console.log("Registration successful for:", email);
    res.json({ message: "Registration successful. Please verify OTP." });
  } catch (error) {
    console.error("[REGISTER] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyOTPHandler(req, res) {
  try {
    const { email, otp } = req.body;
    console.log("Verifying OTP for:", email);

    try {
      verifyOTP(email, otp);

      console.log("OTP verified, updating user verification status:", email);
      await supabase
        .from("Users_duplicate")
        .update({ is_verified: true })
        .eq("email", email);

      console.log("OTP verification successful for:", email);
      res.json({ message: "OTP verified successfully" });
    } catch (otpError) {
      console.error("[OTP VERIFY] Invalid OTP for:", email, "Error:", otpError);
      res.status(400).json({ error: otpError.message });
    }
  } catch (error) {
    console.error("[OTP VERIFY] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
