"use client";

import { useState } from "react";

export default function WithdrawalPage() {
  const COINS_PER_DIAMOND = 20000;
  const RUPEES_PER_DIAMOND = 4;

  const [coins, setCoins] = useState(3520000);
  const diamonds = Math.floor(coins / COINS_PER_DIAMOND);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("JazzCash");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  function submitWithdrawal(e) {
    e.preventDefault();

    const value = Number(amount);

    if (!value || value < 1000) {
      setStatus("Minimum withdrawal request is 1,000 Diamonds.");
      return;
    }

    if (value > diamonds) {
      setStatus("Insufficient withdrawal-eligible Diamonds.");
      return;
    }

    if (!account.trim() || !name.trim()) {
      setStatus("Please enter your account name and account number.");
      return;
    }

    setCoins((currentCoins) =>
      Math.max(0, currentCoins - value * COINS_PER_DIAMOND)
    );

    setStatus(
      `Withdrawal request submitted: ${value.toLocaleString()} Diamonds. Status: Pending Admin Review.`
    );

    setAmount("");
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Diamond Withdrawal</h1>

            <p style={styles.muted}>
              Promotional / eligible Diamond balance
            </p>
          </div>

          <div style={styles.balance}>
            🪙 {coins.toLocaleString()}
            <br />
            💎 {diamonds.toLocaleString()}
            <br />
            Rs. {(diamonds * RUPEES_PER_DIAMOND).toLocaleString()}
          </div>
        </div>

        <div style={styles.conversion}>

          <div>
            <b style={styles.conversionB}>
              Purchase Conversion
            </b>

            <span style={styles.conversionSpan}>
              20,000 Coins = 1 Diamond
            </span>
          </div>

          <div>
            <b style={styles.conversionB}>
              Diamond Value
            </b>

            <span style={styles.conversionSpan}>
              1 Diamond = Rs. 4
            </span>
          </div>

          <div>
            <b style={styles.conversionB}>
              Current Example
            </b>

            <span style={styles.conversionSpan}>
              3,520,000 Coins = 176 Diamonds = Rs. 704
            </span>
          </div>

        </div>

        <div style={styles.notice}>
          <b>Withdrawal-eligible balance</b>

          <p>
            Only Diamonds marked as withdrawal-eligible can be requested.
            Wagered or restricted balances are not automatically converted
            into cash.
          </p>
        </div>

        <form onSubmit={submitWithdrawal}>

          <label style={styles.label}>
            Withdrawal Method
          </label>

          <div style={styles.methods}>
            {["JazzCash", "Easypaisa", "Bank"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setMethod(item)}
                style={{
                  ...styles.method,
                  ...(method === item
                    ? styles.methodActive
                    : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <label style={styles.label}>
            Account Holder Name
          </label>

          <input
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account holder name"
          />

          <label style={styles.label}>
            Account / Wallet Number
          </label>

          <input
            style={styles.input}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Enter account or wallet number"
          />

          <label style={styles.label}>
            Diamonds to Withdraw
          </label>

          <input
            style={styles.input}
            type="number"
            min="1000"
            max={diamonds}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimum 1,000"
          />

          <div style={styles.calculation}>
            {amount && Number(amount) > 0 ? (
              <>
                <span>
                  Diamonds: {Number(amount).toLocaleString()}
                </span>

                <strong>
                  Cash Value: Rs.{" "}
                  {(
                    Number(amount) * RUPEES_PER_DIAMOND
                  ).toLocaleString()}
                </strong>
              </>
            ) : (
              <span>
                1 Diamond = Rs. 4
              </span>
            )}
          </div>

          <button
            style={styles.submit}
            type="submit"
          >
            REQUEST WITHDRAWAL
          </button>

        </form>

        {status && (
          <div style={styles.status}>
            {status}
          </div>
        )}

        <div style={styles.rules}>

          <b>Withdrawal Status</b>

          <p>
            Requests are recorded as Pending until reviewed by an admin.
          </p>

          <p>
            Do not enter passwords, PINs, or OTP codes.
          </p>

        </div>

      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px 14px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: 620,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 8px 30px rgba(0,0,0,.08)",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  h1: {
    margin: 0,
    fontSize: 24,
  },

  muted: {
    color: "#777",
    margin: "6px 0 0",
    fontSize: 13,
  },

  balance: {
    background: "#111111",
    color: "#ffffff",
    borderRadius: 12,
    padding: "10px 13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
    lineHeight: 1.6,
  },

  conversion: {
    margin: "14px 0",
    display: "grid",
    gap: 8,
    background: "#fff8e8",
    borderRadius: 13,
    padding: 14,
    fontSize: 13,
  },

  conversionB: {
    display: "block",
  },

  conversionSpan: {
    display: "block",
    color: "#666",
    marginTop: 3,
  },

  notice: {
    margin: "20px 0",
    background: "#f5f7fa",
    borderRadius: 13,
    padding: 14,
    fontSize: 13,
    lineHeight: 1.5,
  },

  label: {
    display: "block",
    margin: "14px 0 7px",
    fontWeight: 700,
    fontSize: 13,
  },

  methods: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },

  method: {
    border: "2px solid #eeeeee",
    background: "#ffffff",
    borderRadius: 10,
    padding: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  methodActive: {
    borderColor: "#111111",
    background: "#111111",
    color: "#ffffff",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    border: "1px solid #dddddd",
    borderRadius: 10,
    outline: "none",
    fontSize: 14,
  },

  calculation: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    background: "#f7f7f7",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 13,
  },

  submit: {
    width: "100%",
    marginTop: 18,
    padding: 14,
    border: 0,
    borderRadius: 11,
    background: "#111111",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
  },

  status: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#eef6ff",
    fontSize: 13,
  },

  rules: {
    marginTop: 18,
    padding: 14,
    background: "#fafafa",
    borderRadius: 12,
    fontSize: 12,
    color: "#666",
    lineHeight: 1.5,
  },
};