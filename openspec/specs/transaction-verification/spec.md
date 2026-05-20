# Transaction Verification

## Purpose
This capability specifies how the application verifies payment transactions on the TON blockchain network before recording them in the system.

## Requirements

### Requirement: On-Chain Transaction Verification
The system SHALL verify the payment transaction on the TON blockchain using a public TON API before saving the prediction.

#### Scenario: Successful Transaction Verification
- **WHEN** the user signs the transaction in their wallet and a transaction hash is returned
- **THEN** the system queries the TON API, confirms that the transaction hash is valid, recipient matches the configured wallet address, and amount matches 0.01 TON, and saves the prediction in Supabase as `is_paid = true`

#### Scenario: Incorrect Wallet or Amount
- **WHEN** the verified transaction hash reveals a transaction sent to a different wallet or for a different amount than 0.01 TON
- **THEN** the system rejects the submission, displays a detailed error message, and does not save the prediction as paid in Supabase

#### Scenario: Transaction Not Found or Timeout
- **WHEN** the TON API does not find the transaction hash within the verification timeout period
- **THEN** the system displays a retry prompt to the user and keeps the prediction in an unpaid/unsubmitted state
