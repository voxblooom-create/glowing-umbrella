import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Step 1: Get user ID from username using POST endpoint
    const usernameResponse = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    })

    if (!usernameResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch user from Roblox" }, { status: usernameResponse.status })
    }

    const usernameData = await usernameResponse.json()

    if (!usernameData.data || usernameData.data.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = usernameData.data[0].id
    const displayName = usernameData.data[0].displayName

    // Step 2: Get user details
    const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`)

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch user details" }, { status: userResponse.status })
    }

    const userData = await userResponse.json()

    // Step 3: Get avatar thumbnail
    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
    )

    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`

    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json()
      if (avatarData.data && avatarData.data.length > 0) {
        avatarUrl = avatarData.data[0].imageUrl
      }
    }

    // Return combined data
    return NextResponse.json({
      id: userId,
      username: userData.name,
      displayName: userData.displayName || displayName,
      avatar: avatarUrl,
      created: userData.created,
      description: userData.description || "",
    })
  } catch (error) {
    console.error("Error fetching Roblox user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
