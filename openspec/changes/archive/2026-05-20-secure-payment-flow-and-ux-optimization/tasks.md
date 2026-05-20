## 1. Live Match Countdown Timer

- [x] 1.1 Implement countdown calculation math inside `src/pages/Home.jsx` using `match.date`.
- [x] 1.2 Create a 1-second interval inside a `useEffect` hook to update the live timer values.
- [x] 1.3 Implement condition checking to disable score inputs and the submit button when the timer hits 0.

## 2. On-Chain Transaction Verification

- [x] 2.1 Write verification service in `src/lib/tonConnect.js` (or inline in `Home.jsx`) to query the TonCenter HTTP API (`https://toncenter.com/api/v2/getTransactions`).
- [x] 2.2 Implement polling logic to query destination wallet transactions and verify the sender, value (0.01 TON), and timestamp.
- [x] 2.3 Update the submission flow to poll this verification check before recording the prediction to Supabase.

## 3. Robust Error Handling & UI Toast Alerts

- [x] 3.1 Map TON wallet exception responses (e.g., error code 300 user rejection, lack of funds) to clean user-facing error messages.
- [x] 3.2 Add sleek loading spinners and statuses in the UI for the blockchain verification phase.
- [x] 3.3 Ensure the Supabase client catches connection or write errors without freezing the UI.
