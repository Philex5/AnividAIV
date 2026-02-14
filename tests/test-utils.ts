/**
 * 测试工具函数
 */

export async function setupTestEnvironment(): Promise<void> {
  // 设置测试环境
  // - 设置测试数据库连接
  // - 初始化测试数据
  // - 配置测试环境变量
  console.log("Setting up test environment...");
}

export async function cleanupTestEnvironment(): Promise<void> {
  // 清理测试环境
  // - 删除测试数据
  // - 关闭数据库连接
  console.log("Cleaning up test environment...");
}

export function createTestUser(): any {
  return {
    uuid: "test-user-uuid",
    email: "test@example.com",
    display_name: "Test User",
  };
}

export function createTestCharacter(userUuid: string): any {
  return {
    uuid: "test-character-uuid-12345",
    name: "Test Character",
    user_uuid: userUuid,
    visibility_level: "public",
    gender: "female",
    species: "Human",
    role: "Warrior",
    age: 20,
    modules: {
      appearance: {
        name: "Test Character",
        gender: "female",
        age: 20,
        species: "Human",
        role: "Warrior",
        hair_color: "Black",
        hair_style: "Long",
        eye_color: "Blue",
        outfit_style: "Medieval armor",
        theme_color: "#8b5cf6",
      },
      personality: {
        personality_tags: ["Brave", "Kind", "Intelligent"],
        greeting: "Hello, nice to meet you!",
        quotes: ["I will protect everyone!", "Together we are stronger!"],
      },
      background: {
        brief_introduction: "A brave warrior from a distant land.",
        background_story:
          "Born in a small village, Test Character discovered their fighting abilities at a young age. They have traveled across many lands, fighting against evil forces and protecting the innocent.",
      },
      art: {
        gallery: {
          portrait: {
            value: "test-portrait-uuid",
          },
          design_sheet: {
            value: "test-design-uuid",
          },
        },
      },
    },
    tags: ["warrior", "medieval", "brave"],
    personality_tags: ["Brave", "Kind", "Intelligent"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function mockAuthSession(userUuid?: string): any {
  return {
    user: {
      uuid: userUuid || "test-user-uuid",
      email: "test@example.com",
    },
  };
}

export function assertResponseStatus(
  response: Response,
  expectedStatus: number
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${response.statusText}`
    );
  }
}

export async function assertResponseJson(
  response: Response
): Promise<any> {
  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("application/json")) {
    throw new Error(
      `Expected JSON response, got ${contentType}`
    );
  }
  return response.json();
}

export async function assertResponseBlob(
  response: Response
): Promise<Blob> {
  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("application/")) {
    throw new Error(
      `Expected blob response, got ${contentType}`
    );
  }
  return response.blob();
}
