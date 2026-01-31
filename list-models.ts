import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const client = new BedrockClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

async function listModels() {
    try {
        console.log("Listing Cohere models on Bedrock...");
        const command = new ListFoundationModelsCommand({
            byProvider: "cohere"
        });
        const response = await client.send(command);

        if (response.modelSummaries) {
            console.log("\nAvailable Cohere Models:");
            response.modelSummaries.forEach(model => {
                if (model.outputModalities?.includes("EMBEDDING")) {
                    console.log(`- ID: ${model.modelId} | Name: ${model.modelName}`);
                }
            });
        } else {
            console.log("No models found.");
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
