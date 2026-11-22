# Requirements: skeleton (EARS)

## R1 Evidence
1.1 The system shall represent evidence as a record with id, source, time (ISO 8601) and license.
1.2 If an evidence record lacks any of those fields or has an unparsable time, then the system shall reject it with an error naming the field.

## R2 Checks
2.1 The system shall represent a check as pass or fail with a human-readable reason.
2.2 Where a check is marked blocking, the system shall treat its failure as making the reading untrustworthy.

## R3 Triage
3.1 The system shall assign every decision exactly one level: Needs you, Watch or Fine.
3.2 When a decision has a failed blocking check, the system shall assign Needs you.
3.3 When evidence becomes worse (higher risk or more failed checks), the system shall not lower the level.

## R4 Inbox
4.1 The system shall render one card per decision, citing each piece of its evidence.
4.2 The system shall order cards Needs you, then Watch, then Fine.
4.3 When the user requests a report, the system shall export the inbox as Markdown.
4.4 The inbox shall be keyboard operable and screen-reader labelled, in a dark theme.

## R5 Apps
5.1 An app shall be defined as a config plus adapters.
5.2 When the user runs `npm run new-app <name>`, the system shall scaffold an app directory that builds and tests.
5.3 If the name is not lowercase kebab-case or the directory exists, then the system shall refuse and change nothing.
