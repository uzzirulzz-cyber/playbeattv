import crypto from "crypto";

// JazzCash payment integration (Pakistan).
// Docs: https://sandbox.jazzcash.com.pk/
// Flow: server builds a signed form -> POST to JazzCash -> user pays -> redirect to return URL.

export interface JazzCashConfig {
  merchantId: string;
  password: string;
  integritySalt: string; // Integrity Salt (hash key)
  returnUrl: string;
  // Sandbox: https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/
  // Live:    https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/
  endpoint: string;
  isSandbox: boolean;
}

export function getJazzCashConfig(): JazzCashConfig {
  const isSandbox = process.env.JAZZCASH_SANDBOX !== "false";
  return {
    merchantId: process.env.JAZZCASH_MERCHANT_ID || "MC828933",
    password: process.env.JAZZCASH_PASSWORD || "t3zz48w4aa",
    integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "tdw4713y34",
    returnUrl: process.env.JAZZCASH_RETURN_URL || "https://playbeat.digital/jazzcash/return",
    endpoint: isSandbox
      ? "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
      : "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/",
    isSandbox,
  };
}

export interface JazzCashPaymentParams {
  txnRefNo: string;
  amount: number; // in PKR (whole rupees, JazzCash expects amount in paisa = *100)
  description: string;
  billReference: string;
}

/**
 * Build the complete set of form fields for a JazzCash POST, including the
 * HMAC-SHA256 secure hash computed server-side.
 *
 * The hash string is built by sorting all non-empty `pp_` and `ppmpf_` fields
 * alphabetically by name, joining values with '&', prefixed with the Integrity Salt.
 */
export function buildJazzCashRequest(
  params: JazzCashPaymentParams
): { fields: Record<string, string>; action: string } {
  const cfg = getJazzCashConfig();

  const now = new Date();
  const txnDateTime = formatJazzCashDate(now);
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry
  const txnExpiryDateTime = formatJazzCashDate(expiry);

  // Amount must be in paisa (multiply by 100), as an integer string.
  const amountStr = String(Math.round(params.amount * 100));

  // All pp_ fields (alphabetical order matters for the hash).
  const fields: Record<string, string> = {
    pp_Version: "1.1",
    pp_TxnType: "MPAY",
    pp_MerchantID: cfg.merchantId,
    pp_Language: "EN",
    pp_Password: cfg.password,
    pp_TxnRefNo: params.txnRefNo,
    pp_Amount: amountStr,
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDateTime,
    pp_TxnExpiryDateTime: txnExpiryDateTime,
    pp_BillReference: params.billReference,
    pp_Description: params.description,
    pp_ReturnURL: cfg.returnUrl,
    pp_SecureHash: "", // filled after hashing
    ppmpf_1: "1",
    ppmpf_2: "2",
    ppmpf_3: "3",
    ppmpf_4: "4",
    ppmpf_5: "5",
  };

  // Build the hash string: IntegritySalt & sorted(field values) joined by '&'
  const sortedKeys = Object.keys(fields)
    .filter((k) => k !== "pp_SecureHash" && fields[k] !== "")
    .sort();
  const hashValues = [cfg.integritySalt, ...sortedKeys.map((k) => fields[k])].join("&");

  const secureHash = crypto
    .createHmac("sha256", cfg.integritySalt)
    .update(hashValues)
    .digest("hex")
    .toUpperCase();

  fields.pp_SecureHash = secureHash;

  return { fields, action: cfg.endpoint };
}

function formatJazzCashDate(d: Date): string {
  const yyyy = d.getUTCFullYear().toString();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

/** Generate a unique transaction reference number. */
export function generateTxnRefNo(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  const rand = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `PB${ts}${rand}`;
}

/**
 * Verify the response hash returned by JazzCash after payment redirect.
 * Returns true if the response is authentic (not tampered).
 */
export function verifyJazzCashResponse(
  response: Record<string, string>
): boolean {
  const cfg = getJazzCashConfig();
  const receivedHash = response.pp_SecureHash;
  if (!receivedHash) return false;

  // Build the hash from the response fields (same algorithm as request).
  const sortedKeys = Object.keys(response)
    .filter((k) => k.startsWith("pp_") && k !== "pp_SecureHash" && response[k] !== "")
    .sort();
  const hashValues = [cfg.integritySalt, ...sortedKeys.map((k) => response[k])].join("&");

  const computedHash = crypto
    .createHmac("sha256", cfg.integritySalt)
    .update(hashValues)
    .digest("hex")
    .toUpperCase();

  return computedHash === receivedHash.toUpperCase();
}

/** Parse the JazzCash response status. */
export function parseJazzCashResponse(response: Record<string, string>): {
  success: boolean;
  statusCode: string;
  statusMessage: string;
  txnRefNo: string;
  amount: number;
} {
  const success = response.pp_ResponseCode === "000";
  return {
    success,
    statusCode: response.pp_ResponseCode || "UNKNOWN",
    statusMessage: response.pp_ResponseMessage || "No response",
    txnRefNo: response.pp_TxnRefNo || "",
    amount: response.pp_Amount ? Number(response.pp_Amount) / 100 : 0,
  };
}
