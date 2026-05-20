# Match Countdown

## Purpose
This capability specifies how the application displays and restricts predictions based on the match kickoff timer.

## Requirements

### Requirement: Match Kickoff Live Countdown
The system SHALL display a live countdown timer and restrict predictions once kickoff is reached.

#### Scenario: Countdown Rendered and Ticking
- **WHEN** the active match kickoff time is in the future
- **THEN** the system displays a countdown timer showing the remaining days, hours, minutes, and seconds, updating once per second

#### Scenario: Kickoff Reached Cutoff
- **WHEN** the match kickoff time is reached (countdown hits 0)
- **THEN** the system immediately disables all score input fields, changes the submit button to say "Predictions Closed", and hides the TON wallet interaction buttons for that match
