# UCA Secure Share

A self-hosted, secure file sharing platform forked from [Pingvin Share](https://github.com/stonith404/pingvin-share). UCA Secure Share is maintained independently, continuing support and development with a focus on private, encrypted file transfers.

## Features
- Share files via secure, end-to-end encrypted links
- Unlimited file size (restricted only by disk space)
- Optional expiration dates, visitor limits, and password protection
- Email notifications for recipients
- Reverse shares for receiving files
- OIDC and LDAP authentication support
- ClamAV integration for malware scanning
- Local and S3 storage backends

## Setup
### Docker (Recommended)
1. Download the `docker-compose.yml` from the releases or build the image:
```bash
docker build -t uca-secure-share .
```
2. Run:
```bash
docker compose up -d
```
3. Access the service at `http://localhost:3000`

## Compliance
All usage must comply with German federal law (StGB, NetzDG). Prohibited content includes hate speech, Nazi symbolism (§86a StGB), CSAM (§184b StGB), malware, and copyrighted material. Illegal shares are removed immediately, and all associated data (IP logs, timestamps, file metadata) is forwarded to law enforcement.

## Server Info
Hosted on high-speed US infrastructure with enterprise-grade anti-DDoS protection. Free to use without registration.

## Credits
Originally forked from [stonith404/pingvin-share](https://github.com/stonith404/pingvin-share) (archived). Maintained by UCA.
