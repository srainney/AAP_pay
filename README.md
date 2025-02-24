# AAP <Pay> Integration

This project consists of three main components that work together to handle payment processing with Twilio Agent Assisted <Pay> integration:

## Server

The server component is built using Twilio Serverless Functions and handles various aspects of payment processing, call management, and synchronization.

### Setup

1. Navigate to the Server directory:
```bash
cd Server
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file based on `.env copy`:
```bash
cp '.env copy' .env
```

4. Configure the following environment variables in `.env`:
```
ACCOUNT_SID=your_twilio_account_sid
AUTH_TOKEN=your_twilio_auth_token
API_KEY=your_twilio_api_key
API_SECRET=your_twilio_api_secret
```

5. Deploy the serverless functions:
```bash
pnpm run deploy
```

## JSClient

A lightweight HTML/JavaScript client for handling payment processing UI.

### Setup

1. Navigate to the JSClient directory:
```bash
cd JSClient
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

## Phone Call Flow

1. **Initiating a Call**
   - The call is initiated through either `functions/pv/callToPSTN.js` (for regular phone numbers) or `functions/pv/callToSIP.js` (for SIP endpoints)
   - Upon successful connection, Twilio generates a unique Call SID

2. **Capturing the Call SID**
   - The Call SID is returned in the response from the call initiation function
   - This SID is used to track the specific call session

4. **Payment Processing**
   - During the call, payment information is tokenized (`functions/connector/tokenize.js`)
   - The payment is processed through the charge endpoint (`functions/connector/charge.js`)
   - Real-time updates are synchronized across all clients using Twilio Sync

## Development Workflow

1. Start all components:
```bash
# Terminal 1 - Server
cd Server && pnpm dev

# Terminal 2 - JSClient
cd JSClient && pnpm dev
```

2. Access the applications:
- JSClient: http://localhost:1234 (or the port shown in terminal)
- Server functions will be available at your Twilio Runtime domain

## Notes

- Ensure all environment variables are properly configured in each component's `.env` file
- The Server component must be deployed to Twilio for production use
- Local development of the Server component requires the Twilio CLI with serverless plugin
