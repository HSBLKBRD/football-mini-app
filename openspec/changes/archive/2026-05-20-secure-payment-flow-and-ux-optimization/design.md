## Context

The current client-side application submits predictions immediately after the wallet interaction begins, without validating that the transaction has actually completed or reached the destination wallet. We need to implement client-side transaction verification using a public TON blockchain API and improve the client's match timer and error handling UX.

## Goals / Non-Goals

**Goals:**
* Verify that the TON transaction has actually occurred, was sent to the correct destination, and has the correct value (0.01 TON) before saving the prediction.
* Display custom error messages for common transaction failures (wallet rejection, insufficient funds, timeouts).
* Provide a live match countdown timer that disables predictions as soon as the match starts.
* Retain the existing premium dark-theme visual style.

**Non-Goals:**
* Deploying a dedicated custom Node/Python backend. We will implement verification client-side via public TON API (TonCenter or TonAPI) and update the Supabase database directly from the client.
* Full Sybil attack prevention (which would require a secure backend server to execute the transaction check). This is a client-side verification MVP.

## Decisions

### 1. Verification API Choice
* **Choice**: Use the TonCenter API (`https://toncenter.com/api/v2/getTransactions` or testnet equivalent).
* **Rationale**: TonCenter is the standard public indexer for the TON blockchain. It is free to use for low-frequency requests (up to 1 request per second without an API key).
* **Workflow**:
  1. Once the user approves the transaction via TON Connect, the wallet returns a payload.
  2. Since standard TON Connect `sendTransaction` returns a `{ boc }` string (which represents the transaction message but is not the transaction hash itself), we will fetch the transactions of our destination wallet (`REACT_APP_WALLET_ADDRESS`) using the TonCenter API.
  3. We will poll the transactions of the destination wallet to find a transaction where the sender matches the connected user's wallet address, the amount is `10000000` nanotons, and the timestamp is very recent (within 5 minutes).
  4. Once found, we mark the prediction as `is_paid = true` and submit it to Supabase.

### 2. Live Countdown and Cutoff
* **Choice**: A React `useEffect` hook running a `setInterval` once per second.
* **Rationale**: Simple, low-overhead, and keeps the timer accurate.
* **Design**: The timer will format the difference in `HH:MM:SS` or `Dd Hh Mm Ss`. Once the difference is $\le 0$, we set the state to disabled, trigger a re-render to lock the input form, and show "Predictions Closed".

### 3. Error Handling and Toast UI
* **Choice**: Elegant inline alerts/toasts integrated directly into the `MatchCard` wrapper.
* **Rationale**: Keeping layout clean and focused on the mobile WebApp view.

## Risks / Trade-offs

* **[Risk] Transaction Indexing Delay**: TON blockchain indexing on free TonCenter endpoints can sometimes take 5 to 20 seconds.
  * *Mitigation*: Display a premium loading spinner with a message explaining that blockchain confirmation is in progress.
* **[Risk] Rate Limiting**: The public TonCenter API has a rate limit of 1 req/sec.
  * *Mitigation*: Set the transaction polling interval to 3 seconds and stop polling after 60 seconds (timeout).
