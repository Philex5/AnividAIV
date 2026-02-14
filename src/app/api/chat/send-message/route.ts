import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { ChatService, SendMessageSchema } from "@/services/chat/chat-service";

export async function POST(request: NextRequest) {
  const userUuid = await getUserUuid();
  if (!userUuid) {
    return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = SendMessageSchema.parse(body);
    const chatService = new ChatService(userUuid);

    // ✅ Use streaming response with SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Stream the response
          for await (const chunk of chatService.sendMessageStreamed(validated)) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Signal the end of the stream
          controller.enqueue(encoder.encode(`event: end\ndata: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({
            type: "error",
            error: "Message generation failed. Please try again.",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
      cancel() {
        // Handle stream cancellation
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
  } catch (error: any) {
    console.error("Chat send-message error:", error);
    return Response.json(
      { success: false, error: error?.message || "Invalid request" },
      { status: error?.code === "MODEL_NOT_ALLOWED" ? 403 : 400 }
    );
  }
}

