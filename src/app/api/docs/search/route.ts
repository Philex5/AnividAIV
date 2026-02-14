// 暂时禁用文档搜索API以修复构建错误
// TODO: 重新启用并修复 Fumadocs 配置问题
export async function GET() {
  return new Response(JSON.stringify({ error: "Docs search temporarily disabled" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
