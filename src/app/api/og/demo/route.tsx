import { ImageResponse } from "next/og";

export async function GET() {
  try {
    // --- 模拟数据 ---
    const themeColor = "#f43f5e"; // 玫瑰红主题
    const character = {
      name: "Crimson Valkyrie",
      subName: "Eternal Flame / Rank S",
      rarity: "SSR",
      quotes:
        "My blade is forged in the embers of the fallen stars. Witness the true power of the crimson dawn.",
      attributes: [
        { label: "ATK", value: "95", color: "#f43f5e" },
        { label: "DEF", value: "82", color: "#3b82f6" },
        { label: "SPD", value: "88", color: "#10b981" },
        { label: "LUK", value: "75", color: "#f59e0b" },
      ],
    };

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          fontFamily: "sans-serif",
        }}
      >
        {/* 背景装饰：大魔法阵或光晕 */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${themeColor}22 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />

        {/* 卡牌主体 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "420px",
            height: "650px",
            background: `linear-gradient(135deg, ${themeColor}, #fbbf24, ${themeColor})`,
            padding: "3px", // 极细外框线
            borderRadius: "24px",
            boxShadow: `0 0 50px ${themeColor}44`,
            position: "relative",
          }}
        >
          {/* 第二层繁复边框：金属装饰层 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              background: "#1a1a1a",
              borderRadius: "21px",
              padding: "12px",
              position: "relative",
            }}
          >
            {/* 四角装饰 */}
            {[
              {
                top: 0,
                left: 0,
                borderRight: "2px solid gold",
                borderBottom: "2px solid gold",
              },
              {
                top: 0,
                right: 0,
                borderLeft: "2px solid gold",
                borderBottom: "2px solid gold",
              },
              {
                bottom: 0,
                left: 0,
                borderRight: "2px solid gold",
                borderTop: "2px solid gold",
              },
              {
                bottom: 0,
                right: 0,
                borderLeft: "2px solid gold",
                borderTop: "2px solid gold",
              },
            ].map((style, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: "30px",
                  height: "30px",
                  opacity: 0.6,
                  ...style,
                }}
              />
            ))}

            {/* 内侧内容容器 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                backgroundColor: "#0a0a0a",
                borderRadius: "16px",
                border: "1px solid #333",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* 1. 上部：立绘区域 (约占 60%) */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "380px",
                  display: "flex",
                  justifyContent: "center",
                  background: "linear-gradient(to bottom, #111, #000)",
                }}
              >
                {/* 立绘背景光效 */}
                <div
                  style={{
                    position: "absolute",
                    top: "20%",
                    width: "280px",
                    height: "280px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${themeColor}33 0%, transparent 70%)`,
                  }}
                />

                {/* 装饰性网格/魔法阵背景 */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: 0.1,
                    backgroundImage: `radial-gradient(${themeColor} 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* 角色立绘 */}
                <img
                  src="https://artworks.anividai.com/social/og/anividai-og.webp" // 临时占位，实际会是角色立绘
                  style={{
                    width: "100%",
                    height: "120%",
                    position: "absolute",
                    top: "-20px",
                    objectFit: "contain",
                    zIndex: 5,
                  }}
                />

                {/* 立绘底部渐变，平滑过渡到信息区 */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: "100px",
                    background:
                      "linear-gradient(to top, #0a0a0a 10%, transparent)",
                    zIndex: 6,
                  }}
                />

                {/* 稀有度标签 - 漂浮效果 */}
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    background: `linear-gradient(90deg, #fbbf24, ${themeColor})`,
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "900",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                    zIndex: 10,
                  }}
                >
                  {character.rarity}
                </div>
              </div>

              {/* 2. 下部：信息区域 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px",
                  flex: 1,
                  zIndex: 10,
                }}
              >
                {/* 角色姓名 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "15px",
                  }}
                >
                  <div
                    style={{
                      color: "white",
                      fontSize: "32px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      textShadow: `0 0 10px ${themeColor}88`,
                    }}
                  >
                    {character.name}
                  </div>
                  <div
                    style={{
                      color: themeColor,
                      fontSize: "12px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                      marginTop: "-5px",
                    }}
                  >
                    {character.subName}
                  </div>
                </div>

                {/* 角色属性 - 替代雷达图 */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "15px",
                  }}
                >
                  {character.attributes.map((attr) => (
                    <div
                      key={attr.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#1a1a1a",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        width: "calc(50% - 5px)",
                        border: "1px solid #333",
                      }}
                    >
                      <span
                        style={{
                          color: attr.color,
                          fontWeight: "bold",
                          fontSize: "10px",
                          width: "30px",
                        }}
                      >
                        {attr.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: "4px",
                          backgroundColor: "#333",
                          borderRadius: "2px",
                          margin: "0 8px",
                        }}
                      >
                        <div
                          style={{
                            width: `${attr.value}%`,
                            height: "100%",
                            backgroundColor: attr.color,
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {attr.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 角色语录 */}
                <div
                  style={{
                    color: "#888",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    fontStyle: "italic",
                    borderLeft: `2px solid ${themeColor}`,
                    paddingLeft: "10px",
                  }}
                >
                  "{character.quotes}"
                </div>
              </div>

              {/* 底部装饰条 */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  width: "100%",
                  height: "4px",
                  background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>,
      {
        width: 800,
        height: 800, // 增加高度以适应纵向布局
      },
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
