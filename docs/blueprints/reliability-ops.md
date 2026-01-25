# Reliability + Ops Blueprint

## Goal
Prevent silent failures and keep waitlist flow healthy.

## Observability
- Log Streak failures with status + response
- Log email failures
- Store failed payloads for retry

## Alerts
- Slack/Email alert on repeated failures
- Daily error summary

## Retries
- Retry Streak creation up to 3 times
- Retry email send up to 2 times

## Implementation Checklist
- [ ] Add error tracking
- [ ] Add retry logic
- [ ] Add alerting channel
