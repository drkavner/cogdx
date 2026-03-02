# Handle Discovery Playbook (Wave 1)

## Goal
Resolve contact handles for 6 qualified prospects as fast as possible.

## Search Order by Channel
1. X: profile bio -> website -> link-in-bio contact
2. Telegram: username lookup from X bio/site
3. Discord: server member + role lookup (founder/operator tags)
4. GitHub: profile email/public discussions + linked socials

## Timebox Rules
- Max 8 minutes per prospect on direct-handle search
- If unresolved, switch to fallback route immediately

## Fallback Routes
- Public reply with CTA to DM
- GitHub issue/discussion intro message
- Discord intro in appropriate channel

## Logging Standard
Update OUTBOUND_TRACKER.csv:
- handle_or_contact
- status -> ready_to_send
- next_action -> send_wave1

## Done Condition
6 qualified prospects have either:
- direct handle resolved, OR
- fallback route prepared
