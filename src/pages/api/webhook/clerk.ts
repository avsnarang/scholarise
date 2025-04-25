import { type IncomingHttpHeaders } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { Webhook, type WebhookRequiredHeaders } from "svix";
import { buffer } from "micro";

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

type WebhookEvent = {
  data: {
    id: string;
    email_addresses: {
      email_address: string;
      id: string;
    }[];
    first_name: string;
    last_name: string;
    public_metadata: {
      role?: string;
    };
  };
  object: string;
  type: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify the webhook signature
  const payload = (await buffer(req)).toString();
  const headers = req.headers as IncomingHttpHeaders & WebhookRequiredHeaders;
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET ?? "");

  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, headers) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).json({ message: "Invalid signature" });
  }

  const { type, data } = evt;

  // Handle user creation
  if (type === "user.created") {
    try {
      // Instead of trying to create a non-existent User model, log the event
      console.log("User created event received:", data.id);
      // You may want to implement alternative logic here that matches your current schema
      // For example, creating a Teacher, Employee, or updating ClerkID in an existing record

      return res.status(200).json({ message: "User creation event received" });
    } catch (error) {
      console.error("Error processing user creation:", error);
      return res.status(500).json({ message: "Error processing user creation" });
    }
  }

  // Handle user update
  if (type === "user.updated") {
    try {
      // Instead of updating a non-existent User model, log the event
      console.log("User updated event received:", data.id);
      // You may want to implement alternative logic here that matches your current schema

      return res.status(200).json({ message: "User update event received" });
    } catch (error) {
      console.error("Error processing user update:", error);
      return res.status(500).json({ message: "Error processing user update" });
    }
  }

  // Handle user deletion
  if (type === "user.deleted") {
    try {
      // Instead of updating a non-existent User model, log the event
      console.log("User deletion event received:", data.id);
      // You may want to implement alternative logic here that matches your current schema

      return res.status(200).json({ message: "User deletion event received" });
    } catch (error) {
      console.error("Error processing user deletion:", error);
      return res.status(500).json({ message: "Error processing user deletion" });
    }
  }

  return res.status(200).json({ message: "Webhook processed successfully" });
}
