import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;
    const username = formData.get("username") as string; // Passed from frontend

    if (!socketId || !channelName || !username) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    // 1. Check if the username is already taken in this specific channel
    const channelInfo = await pusher.get({
      path: `/channels/${channelName}/users`,
    });

    if (channelInfo.status === 200) {
      const result = await channelInfo.json();
      const existingUsers = result.users.map((u: { id: string }) =>
        u.id.toLowerCase(),
      );

      if (existingUsers.includes(username.toLowerCase().trim())) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 403 },
        );
      }
    }

    // 2. Authorize the presence channel with custom user data
    const presenceData = {
      user_id: username.trim(), // Unique ID used to identify the user
      user_info: { name: username.trim() },
    };

    const authResponse = pusher.authorizeChannel(
      socketId,
      channelName,
      presenceData,
    );
    return NextResponse.json(authResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
