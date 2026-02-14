/**
 * OG 卡片模板组件
 * 用于生成统一风格的分享卡片
 */

import React from "react";
import speciesConfig from "@/configs/characters/species.json";

interface OGCardProps {
  character: any;
  modules: any;
  world?: any;
  avatarUrl: string;
  profileImageUrl: string;
  template: string;
  themeColor: string;
  t: any; // 国际化翻译数据
  storageDomain?: string; // 注入存储域名以构建绝对路径
  genderIconData?: string; // 预解析的性别图标 Base64
  speciesIconData?: string; // 预解析的种族图标 Base64
}

const getGenderColor = (gender: string) => {
  const g = (gender || "").toLowerCase().trim();
  if (g === "male" || g === "m") return "#60a5fa";
  if (g === "female" || g === "f") return "#f472b6";
  return "#a1a1aa";
};

export function OGCardTemplate({
  character,
  modules,
  world,
  profileImageUrl,
  themeColor,
  t,
  storageDomain = "https://artworks.anividai.com", // 默认生产域名，API 路由会覆盖
  genderIconData,
  speciesIconData,
}: OGCardProps) {
  // 深度兜底翻译对象
  const labels = t?.labels || {
    world: "World",
    biography: "Biography",
  };
  
  const stats = deriveStats(modules, t);
  const displayRole = character.role || "Citizen";
  
  const worldName = world?.name || 
                    character.world?.name || 
                    character.world_name || 
                    (character as any).worldName || 
                    modules.world?.name;
  
  const lifeStory = modules.background?.background_story || character.brief_introduction || "No story yet...";

  const gender = (character.gender || "").toLowerCase().trim();
  const genderColor = getGenderColor(gender);

  // 获取性别图标绝对路径
  const getGenderIconUrl = (g: string) => {
    if (genderIconData) return genderIconData;
    let iconName = "transgender.svg";
    if (g === "male" || g === "m") iconName = "male.svg";
    else if (g === "female" || g === "f") iconName = "female.svg";
    return `${storageDomain}/assets/imgs/icons/gender/${iconName}`;
  };

  // 获取种族信息
  const speciesKey = (character.species || "human").toLowerCase().trim().replace(/ /g, "_");
  const speciesInfo = speciesConfig.items.find(item => item.key === speciesKey) || speciesConfig.items[0];
  const speciesIconUrl = speciesIconData || (speciesInfo.icon_url.startsWith("http") 
    ? speciesInfo.icon_url 
    : `${storageDomain}${speciesInfo.icon_url.startsWith("/") ? "" : "/"}${speciesInfo.icon_url}`);

  // 获取扩展属性
  const extendedAttributes = modules.personality?.extended_attributes || {};
  const attrEntries = Object.entries(extendedAttributes).slice(0, 5);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        color: "white",
        position: "relative",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* 背景光晕 */}
      <div 
        style={{ 
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.2,
          backgroundImage: `radial-gradient(circle at 20% 50%, ${themeColor}66 0%, transparent 70%)` 
        }} 
      />

      <div 
        style={{ 
          display: "flex",
          width: "1100px", 
          height: "560px", 
          gap: "40px",
          position: "relative"
        }}
      >
        {/* 左侧：3D 悬浮卡片立绘 */}
        <div 
          style={{ 
            width: "380px",
            display: "flex",
            perspective: "1000px",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div 
            style={{ 
              width: "360px",
              height: "500px",
              backgroundColor: "#18181b",
              borderRadius: "24px",
              border: `2px solid ${themeColor}44`,
              position: "relative",
              overflow: "hidden",
              boxShadow: `0 30px 60px -12px rgba(0,0,0,0.5), 0 0 20px ${themeColor}22`,
              transform: "rotateY(-15deg) rotateX(5deg)",
              display: "flex"
            }}
          >
            <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: `linear-gradient(135deg, ${themeColor}11 0%, transparent 100%)` }} />
            
            <img
              src={profileImageUrl}
              alt={character.name}
              width={360}
              height={500}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            <div 
              style={{ 
                position: "absolute", 
                inset: 0, 
                display: "flex",
                backgroundImage: "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 60%, transparent 100%)",
                backgroundSize: "200% 100%",
                opacity: 0.5
              }} 
            />
          </div>
        </div>

        {/* 右侧：档案信息 */}
        <div 
          style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column",
            padding: "20px 0"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `1px solid rgba(255,255,255,0.1)`, paddingBottom: "8px", marginBottom: "12px" }}>
            <h1 style={{ fontSize: "44px", fontWeight: "900", margin: 0, color: "white" }}>{character.name}</h1>
            {worldName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: themeColor, fontSize: "14px", fontWeight: "600" }}>
                <span style={{ color: "#a1a1aa" }}>{(labels.world || "World")}:</span>
                <span>{worldName}</span>
              </div>
            ) : null}
          </div>

          {/* Quick Info Bar - Real Icons Only */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "12px", color: "#e4e4e7", fontSize: "16px", fontWeight: "bold", alignItems: "center" }}>
            {/* Gender Icon */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "999px",
                  backgroundColor: "#27272a",
                  border: `1px solid ${genderColor}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}
              >
                <img 
                  src={getGenderIconUrl(gender)} 
                  width={16} 
                  height={16} 
                  style={{ width: "16px", height: "16px" }} 
                  alt="gender"
                />
              </div>
            </div>

            {/* Species Icon */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#27272a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}
              >
                <img 
                  src={speciesIconUrl} 
                  width={20} 
                  height={20} 
                  style={{ width: "20px", height: "20px", borderRadius: "2px" }} 
                  alt="species"
                />
              </div>
            </div>

            {/* Age with Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🎂</span>
              <span style={{ fontSize: "18px" }}>{character.age || "--"}</span>
            </div>

            {/* Role Text Only */}
            <div style={{ display: "flex", alignItems: "center", paddingLeft: "20px", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: "18px" }}>{displayRole}</span>
            </div>
          </div>

          {/* Personality Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {(modules.personality?.personality_tags || []).slice(0, 5).map((tag: string) => (
              <div 
                key={tag}
                style={{ 
                  padding: "3px 10px", 
                  borderRadius: "999px", 
                  backgroundColor: `${themeColor}22`, 
                  border: `1px solid ${themeColor}44`,
                  color: themeColor,
                  fontSize: "11px",
                  fontWeight: "bold",
                  display: "flex"
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Core Data: Radar + Extended Attributes */}
          <div style={{ 
            flex: 1,
            display: "flex", 
            backgroundColor: "rgba(255,255,255,0.02)", 
            borderRadius: "20px", 
            padding: "15px 20px", 
            marginBottom: "15px", 
            border: "1px solid rgba(255,255,255,0.05)",
            minHeight: "220px",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{ display: "flex", flex: 4, justifyContent: "center" }}>
              <RadarChart stats={stats} size={200} color={themeColor} />
            </div>

            <div style={{ display: "flex", flex: 6, flexDirection: "column", gap: "8px", alignSelf: "center" }}>
              {attrEntries.length > 0 ? attrEntries.map(([key, value]) => (
                <div 
                  key={key} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    backgroundColor: "rgba(255,255,255,0.03)", 
                    borderRadius: "8px", 
                    padding: "6px 12px",
                    borderLeft: `3px solid ${themeColor}aa`
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: "900", color: themeColor, textTransform: "uppercase", width: "80px", overflow: "hidden" }}>
                    {key}
                  </span>
                  <div style={{ width: "1px", height: "12px", backgroundColor: "rgba(255,255,255,0.1)", margin: "0 12px", display: "flex" }} />
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#e4e4e7", flex: 1, overflow: "hidden" }}>
                    {String(value)}
                  </span>
                </div>
              )) : (
                <div style={{ display: "flex", alignItems: "center", height: "100%", justifyContent: "center", opacity: 0.2 }}>
                  <span style={{ fontSize: "11px", fontStyle: "italic" }}>No details assigned</span>
                </div>
              )}
            </div>
          </div>

          {/* Biography */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {(labels.biography || "Biography")}
            </span>
            <p style={{ 
              fontSize: "14px", 
              lineHeight: "1.5", 
              color: "#d4d4d8", 
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontStyle: "italic"
            }}>
              {lifeStory}
            </p>
          </div>
        </div>
      </div>

      <div 
        style={{ 
          position: "absolute", 
          bottom: "20px", 
          right: "40px", 
          display: "flex", 
          alignItems: "center", 
          gap: "10px",
          opacity: 0.4 
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.2em", color: "white" }}>AnividAI</span>
        <div style={{ width: "1px", height: "10px", backgroundColor: "white", display: "flex" }} />
        <span style={{ fontSize: "10px", color: "#a1a1aa" }}>ARCHIVE CARD</span>
      </div>
    </div>
  );
}

// SVG 雷达图组件
function RadarChart({ stats, size, color }: { stats: any[], size: number, color: string }) {
  const angleStep = (Math.PI * 2) / stats.length;
  const center = size / 2;
  const radius = size * 0.35; 
  const labelRadius = radius + 26;
  
  const points = stats.map((stat, i) => {
    const ratio = (stat.value || 50) / 100;
    const x = center + (radius * ratio) * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + (radius * ratio) * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, display: "flex" }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, display: "flex" }}>
        {[1.0, 0.75, 0.5, 0.25].map((scale) => {
          const polyPoints = stats.map((_, i) => {
            const x = center + (radius * scale) * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + (radius * scale) * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={scale}
              points={polyPoints}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
        
        {stats.map((stat, i) => {
          const angle = (i * angleStep) - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={points}
          fill={`${color}55`}
          stroke={color}
          strokeWidth="2"
        />

        {stats.map((stat, i) => {
          const angle = (i * angleStep) - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill="#a1a1aa"
              opacity={0.8}
            />
          );
        })}
      </svg>

      {stats.map((stat, i) => {
        const angle = (i * angleStep) - Math.PI / 2;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              transform: "translate(-50%, -50%)",
              color: "#a1a1aa",
              fontSize: "10px",
              fontWeight: "900",
              letterSpacing: "0.08em",
              display: "flex",
            }}
          >
            {stat.label}
          </div>
        );
      })}
    </div>
  );
}

function deriveStats(modules: any, t: any) {
  const s = t?.stats || {};
  const statLabels = [
    s.strength || "STR",
    s.intelligence || "INT",
    s.agility || "AGI",
    s.stamina || "STA",
    s.luck || "LUK",
    s.charm || "CHA"
  ];

  if (modules.skills?.stats && modules.skills.stats.length > 0) {
    return statLabels.map((label, i) => {
      const match = modules.skills.stats.find((item: any) => 
        (item.label || "").toLowerCase().includes(label.toLowerCase()) || 
        label.toLowerCase().includes((item.label || "").toLowerCase())
      );
      return {
        label: label.substring(0, 3).toUpperCase(),
        value: match ? Math.min(100, (match.value || 5) * 10) : 55 + (i * 7 % 25)
      };
    });
  }
  return statLabels.map((label, i) => ({
    label: label.substring(0, 3).toUpperCase(),
    value: 60 + (i * 12 % 30)
  }));
}