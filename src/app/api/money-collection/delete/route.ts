import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "Collection ID is required" }, { status: 400 });
    }
    
    // Delete the money collection
    await db.moneyCollection.delete({
      where: { id }
    });
    
    // Return success response
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting money collection:", error);
    
    // Return error response
    return NextResponse.json(
      { error: error.message || "An error occurred while deleting the collection" }, 
      { status: 500 }
    );
  }
} 