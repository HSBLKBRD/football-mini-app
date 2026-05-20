## Why

The current prediction flow marks predictions as paid in Supabase immediately after initiating a wallet transaction. This is vulnerable to spoofing, as a client can skip the transaction or mock its completion. Additionally, the user experience is hampered by a lack of clear feedback during wallet connection or transaction errors (e.g., rejection or low balance), and there is no visual urgency to submit predictions before a match begins.

## What Changes

* **On-Chain Transaction Verification**: Implement verification to check the TON blockchain network for the user's transaction. The prediction will only be confirmed and marked as `is_paid` in Supabase after verifying the transaction hash, amount (0.01 TON), and destination wallet address.
* **Robust Error Handling**: Handle and display clear error messages for wallet rejection, timeout, insufficient funds, and network connectivity issues with Supabase to prevent the UI from hanging.
* **Match Kickoff Live Countdown**: Render a real-time countdown timer for active matches. Once the countdown reaches 0 (the match begins), the prediction submission is automatically disabled.

## Capabilities

### New Capabilities
* `transaction-verification`: Verifies the validity of the TON transaction hash, value, and recipient address on-chain before finalizing database records.
* `match-countdown`: Live countdown timer display and match kickoff prediction cutoff logic.

### Modified Capabilities
*None (first set of specifications being established for this project).*

## Impact

* **Frontend Page (`src/pages/Home.jsx`)**: Add a live countdown timer component, update the submission state machine, handle granular transaction error messages, and trigger the verification step.
* **Supabase Client / Schema**: Check transaction validity on-chain or store transaction hash references in the `predictions` table for validation records.
* **TON API Client**: Utilize a TON RPC or public API (e.g., TonCenter API or TonAPI) to check transaction status from the client side or backend.
