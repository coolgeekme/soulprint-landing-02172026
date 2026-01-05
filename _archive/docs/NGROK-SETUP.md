# Ngrok Setup & Usage Plan

## Current Status
- **Ngrok Binary**: Installed at `../ngrok-v3-stable-windows-amd64/ngrok.exe`
- **Ollama Service**: Running locally on port `11434`
- **Issue**: Previous ngrok attempt failed, likely due to missing Authtoken.

## Setup Steps

1. **Get Authtoken**
   - Go to [dashboard.ngrok.com](https://dashboard.ngrok.com)
   - Sign up or Log in.
   - Copy your Authtoken from the "Your Authtoken" section.

2. **Configure Ngrok**
   Run the following command in the terminal (replace `<YOUR_TOKEN>` with the actual token):
   ```powershell
   & "..\ngrok-v3-stable-windows-amd64\ngrok.exe" config add-authtoken <YOUR_TOKEN>
   ```

3. **Start Tunnel**
   Once configured, start the tunnel to expose Ollama:
   ```powershell
   & "..\ngrok-v3-stable-windows-amd64\ngrok.exe" http 11434
   ```

4. **Verify**
   - Ngrok will show a "Forwarding" URL (e.g., `https://<random>.ngrok-free.app`).
   - This URL can be used to access your local Ollama instance from the internet.
