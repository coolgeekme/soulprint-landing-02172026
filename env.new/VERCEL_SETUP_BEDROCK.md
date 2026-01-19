# Vercel + AWS Bedrock setup (SoulPrint)

This project already supports Bedrock (preferred) and will automatically use it when `BEDROCK_MODEL_ID` is set.

## 1) Enable Bedrock model access (AWS console)
1. Open the AWS console in the same region you plan to use (example: `us-east-1`).
2. Go to **Amazon Bedrock → Model access**.
3. Request/enable access for at least one chat-capable model.
   - Recommended default in this repo: `meta.llama3-8b-instruct-v1:0`

## 2) Create IAM credentials for Bedrock
Create a dedicated IAM user (or role) with least privilege.

Minimum policy (tight + practical):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

Then create an **Access Key** for that IAM user.

> If you use temporary credentials (STS), you must also set `AWS_SESSION_TOKEN`.

## 3) Set Vercel Environment Variables
In Vercel:
- Project → **Settings** → **Environment Variables**
- Add the variables from `env.new/.env.bedrock.example`

At minimum you need:
- `AWS_REGION`
- `BEDROCK_MODEL_ID`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- plus your Supabase vars

## 4) Deploy
Trigger a redeploy in Vercel.

## 5) Verify in logs
Hit any feature that calls the LLM (chat / soulprint generation). In Vercel logs you should see:
- `[LLM] Using AWS Bedrock`

## Optional: verify locally first
1. Copy `env.new/.env.bedrock.example` → `.env.local` (or merge into your existing `.env.local`).
2. Run:
  - `npx tsx scripts/test-bedrock.ts`

## Notes
- You can remove/ignore `SAGEMAKER_ENDPOINT_NAME` when using Bedrock.
- Do **not** commit `.env`, `.env.local`, or any file with secrets.
