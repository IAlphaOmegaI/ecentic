# Reply to Anna — draft

Use only after production publication has been verified. This draft has not been sent.

**Subject:** ecentic × Loop — v1 ready for partner validation

Hi Anna,

We’ve built the first version of ecentic’s Loop integration: [ecentic.ai](https://ecentic.ai).

Each merchant connects their own Loop API key. We read return data only for
that merchant, never combine it across merchants, and never process, cancel or
modify returns. The integration identifies recurring product-information gaps,
checks what AI assistants tell shoppers, and proposes product description
changes for the merchant to review and approve.

We’ve validated the implementation with local automated tests and UI checks
using fixtures. We haven’t yet completed an end-to-end test with a live Loop
merchant.

Could you introduce us to your developer relations team and help us access a
sandbox or test organization, including the recommended test-order and return
workflow? We’d also appreciate confirmation of three integration details:

- Should partners use merchant API keys or OAuth? Is a read-only returns scope
  available? Our current API-key setup requests `returns` and `developer_tools`;
  OAuth remains disabled pending confirmation of its scopes and installation
  requirements, including PKCE support.
- Does `GET /api/v1/auth/me` support API keys, and which response fields identify
  the merchant?
- Can API keys create, list and delete webhook subscriptions? The authentication
  and webhook setup guides appear to differ on this point.

Once those details are confirmed, we’d like to run the live validation with
your team.

Best,
Xhurian
