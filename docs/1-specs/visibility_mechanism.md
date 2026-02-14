Visibility机制梳理
1. OC（原创角色）
Private：仅创建者本人可见，社区其他用户无法访问或搜索到该OC。
Public：所有用户可见，可在社区浏览、搜索、展示。
Allow Remix（仅对Public OC有效）：
开启后，其他用户可以基于该OC进行remix，创建自己的衍生OC。
关闭时，其他用户无法remix该OC。
2. Artwork（图片、视频等）
Private：仅创建者本人可见，不会在社区任何地方展示。
若用户想分享，需手动将artwork设为public。
Public：所有用户可见，可在社区浏览、搜索、展示。
与OC关联时：
若关联OC为public，用户可通过artwork中的related OC头像跳转查看OC详情。
若关联OC为private，artwork中仅展示OC头像，不可点击跳转OC详情页，无法获取OC详细信息。
复用artwork时，不会自动引入原OC信息，用户可用自己的OC进行创作。
优化建议与补充说明
权限边界清晰

OC和artwork的可见性完全独立，互不影响。
artwork即使public，若关联OC为private，OC信息依然受保护。
Remix机制友好

只有public且允许remix的OC才能被他人用作二次创作，保护原创者权益。
remix生成的新OC归新用户所有，原OC信息可选择性保留溯源。
artwork复用机制

用户可基于公开artwork用自己的OC进行再创作，鼓励社区内容流转和创新。
复用时不会泄露原OC信息，保护隐私。
用户体验提示

在artwork详情页，若关联OC为private，相关头像可显示“私有”或“不可查看”提示，避免用户疑惑。
分享private artwork时，弹窗提示“需先设为public方可分享”。
安全与隐私

所有private内容均严格限制访问，防止信息泄露。
用户可随时调整OC和artwork的可见性，灵活掌控内容曝光度。
