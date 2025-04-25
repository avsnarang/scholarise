import { IncomingHttpHeaders } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Webhook, WebhookRequiredHeaders } from "svix";
import { buffer } from "micro";
import { db } from "@/server/db";

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
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
  
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
      // Check if user already exists in the database
      const existingUser = await db.user.findUnique({
        where: { id: data.id },
      });
      
      if (!existingUser) {
        // Create user in the database
        await db.user.create({
          data: {
            id: data.id,
            name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
            email: data.email_addresses[0]?.email_address,
            isActive: true,
            // Add role if specified in metadata
            ...(data.public_metadata.role && {
              roles: {
                create: {
                  role: {
                    connect: {
                      name: data.public_metadata.role,
                    },
                  },
                },
              },
            }),
          },
        });
      }
    } catch (error) {
      console.error("Error creating user in database:", error);
      return res.status(500).json({ message: "Error creating user" });
    }
  }
  
  // Handle user update
  if (type === "user.updated") {
    try {
      // Update user in the database
      await db.user.update({
        where: { id: data.id },
        data: {
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          email: data.email_addresses[0]?.email_address,
        },
      });
    } catch (error) {
      console.error("Error updating user in database:", error);
      return res.status(500).json({ message: "Error updating user" });
    }
  }
  
  // Handle user deletion
  if (type === "user.deleted") {
    try {
      // Set user as inactive instead of deleting
      await db.user.update({
        where: { id: data.id },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      console.error("Error deactivating user in database:", error);
      return res.status(500).json({ message: "Error deactivating user" });
    }
  }
  
  return res.status(200).json({ message: "Webhook processed successfully" });
}
