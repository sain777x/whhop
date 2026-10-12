# WhatsApp Print API + Grok

```bash
npm install
node server.js
```

Abra http://localhost:3000

POST /api/gerar-kit

```json
{
  "rawText": "CLIENTE: Zachary Mccoy\nVALOR: $2499.98 USD\nAPRESENTADOR: frontendbrasil\nPRODUTO: PHP and SQL Programming Mentorship\nlink: https://whop.com/checkout/plan_vn6zEmpxwYNGn\nStatus: APPROVED\nDIA: 30/09/2026\nHORARIO: 18:55"
}
```

Precisa de Chromium/Chrome. Se a xAI estiver sem crédito, o servidor usa o gerador local automaticamente.
